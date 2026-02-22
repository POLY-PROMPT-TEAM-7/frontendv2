import { randomUUID } from "crypto";
import { gzipSync } from "zlib";

import { NextResponse } from "next/server";

import {
  isKnowledgeGraphPayload,
  isRendererGraphPayload,
  studyOntologyToRendererGraph,
} from "../../../../lib/kg/adapters/studyOntologyToRenderer";
import { type Capabilities } from "../../../../lib/kg/capabilities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = new Set([
  ".pdf",
  ".docx",
  ".pptx",
  ".txt",
  ".png",
  ".jpg",
  ".jpeg",
]);

function getExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return "";
  return name.slice(dot).toLowerCase();
}

function safeGzName(fileName: string): string {
  const trimmed = fileName.trim() || "upload";
  return trimmed.endsWith(".gz") ? trimmed : `${trimmed}.gz`;
}

async function readCapabilities(request: Request): Promise<{
  ok: boolean;
  capabilities?: Capabilities;
  error?: Record<string, unknown>;
}> {
  const url = new URL("/api/kg/capabilities", request.url);

  try {
    const res = await fetch(url, { cache: "no-store" });
    const payload = await res.json().catch(() => null);
    if (!payload || typeof payload !== "object") {
      return {
        ok: false,
        error: {
          code: "CAPABILITIES_UNAVAILABLE",
          message: "Capabilities endpoint returned non-JSON payload",
        },
      };
    }

    if ((payload as { ok?: boolean }).ok !== true) {
      return {
        ok: false,
        error:
          (payload as { error?: Record<string, unknown> }).error ??
          ({
            code: "CAPABILITIES_UNAVAILABLE",
            message: "Backend capabilities are unavailable",
          } as Record<string, unknown>),
      };
    }

    const capabilities = (payload as { capabilities?: Capabilities })
      .capabilities;
    if (!capabilities) {
      return {
        ok: false,
        error: {
          code: "CAPABILITIES_INVALID",
          message: "Capabilities payload missing",
        },
      };
    }

    return { ok: true, capabilities };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: {
        code: "CAPABILITIES_UNAVAILABLE",
        message: "Failed to read capabilities",
        detail: { cause: message },
      },
    };
  }
}

function coerceFileList(formData: FormData): File[] {
  return formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File);
}

function validateFiles(
  files: File[],
): { ok: true } | { ok: false; code: string; message: string } {
  if (files.length === 0) {
    return {
      ok: false,
      code: "NO_FILES",
      message: "Please add at least one file",
    };
  }

  for (const file of files) {
    const extension = getExtension(file.name);
    if (!SUPPORTED_EXTENSIONS.has(extension)) {
      return {
        ok: false,
        code: "UNSUPPORTED_FILE_TYPE",
        message: `Unsupported file type: ${file.name}`,
      };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        ok: false,
        code: "FILE_TOO_LARGE",
        message: `File exceeds 25MB limit: ${file.name}`,
      };
    }
  }

  return { ok: true };
}

async function gzipFile(file: File): Promise<Blob> {
  const raw = Buffer.from(await file.arrayBuffer());
  const zipped = gzipSync(raw);
  return new Blob([zipped], { type: "application/gzip" });
}

function getBackendBaseUrl(): string {
  return (process.env.API_URL || "http://localhost:8000").replace(/\/+$/, "");
}

function extractRemoteId(payload: Record<string, unknown>): string | null {
  const candidate = payload.graph_id ?? payload.job_id ?? payload.id;
  if (typeof candidate === "string" && candidate.trim()) return candidate;
  if (typeof candidate === "number" && Number.isFinite(candidate))
    return String(candidate);
  return null;
}

function parseBackendPayload(
  contentType: string | null,
  body: string,
): unknown {
  if (contentType?.toLowerCase().includes("application/json")) {
    return JSON.parse(body);
  }

  try {
    return JSON.parse(body);
  } catch {
    return { raw: body };
  }
}

export async function POST(request: Request) {
  const incomingForm = await request.formData();
  const topicEntry = incomingForm.get("topic");
  const topic = typeof topicEntry === "string" ? topicEntry.trim() : "";
  const files = coerceFileList(incomingForm);

  const validation = validateFiles(files);
  if (!validation.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: validation.code,
          message: validation.message,
        },
      },
      { status: 400 },
    );
  }

  const capsResult = await readCapabilities(request);
  if (!capsResult.ok || !capsResult.capabilities) {
    return NextResponse.json(
      {
        ok: false,
        error: capsResult.error ?? {
          code: "CAPABILITIES_UNAVAILABLE",
          message: "Cannot determine backend upload capabilities",
        },
      },
      { status: 502 },
    );
  }

  const capabilities = capsResult.capabilities;

  if (!capabilities.extractMultipartEndpoint) {
    if (capabilities.extractJsonEndpoint) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "BACKEND_MISSING_UPLOAD_SUPPORT",
            message:
              "Backend only supports text_path JSON extraction; file uploads are unavailable.",
          },
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "BACKEND_MISSING_UPLOAD_SUPPORT",
          message: "Backend did not advertise multipart upload support.",
        },
      },
      { status: 400 },
    );
  }

  const endpoint = capabilities.extractMultipartEndpoint;
  const backendUrl = `${getBackendBaseUrl()}${endpoint.path}`;
  const outboundForm = new FormData();

  for (const file of files) {
    const gzBlob = await gzipFile(file);
    outboundForm.append(endpoint.fileField, gzBlob, safeGzName(file.name));
  }

  if (topic) {
    outboundForm.append("topic", topic);
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(backendUrl, {
      method: endpoint.method.toUpperCase(),
      body: outboundForm,
      cache: "no-store",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "BACKEND_UNREACHABLE",
          message: "Unable to contact backend upload endpoint",
          detail: { backendUrl, cause: message },
        },
      },
      { status: 502 },
    );
  }

  const rawBody = await backendResponse.text();
  const parsed = parseBackendPayload(
    backendResponse.headers.get("content-type"),
    rawBody,
  );

  if (!backendResponse.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "BACKEND_REQUEST_FAILED",
          message: `Backend returned HTTP ${backendResponse.status}`,
          detail: {
            backendUrl,
            status: backendResponse.status,
            payload: parsed,
          },
        },
      },
      { status: 502 },
    );
  }

  if (isKnowledgeGraphPayload(parsed)) {
    const graphId = `local-${randomUUID()}`;
    const rendererGraph = studyOntologyToRendererGraph(parsed);
    return NextResponse.json(
      {
        ok: true,
        mode: "local",
        graphId,
        graph: parsed,
        rendererGraph,
      },
      { status: 200 },
    );
  }

  if (isRendererGraphPayload(parsed)) {
    const graphId = `local-${randomUUID()}`;
    return NextResponse.json(
      {
        ok: true,
        mode: "local",
        graphId,
        graph: null,
        rendererGraph: parsed,
      },
      { status: 200 },
    );
  }

  if (parsed && typeof parsed === "object") {
    const remoteId = extractRemoteId(parsed as Record<string, unknown>);
    if (remoteId) {
      return NextResponse.json(
        {
          ok: true,
          mode: "remote",
          graphId: remoteId,
        },
        { status: 200 },
      );
    }
  }

  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "UNSUPPORTED_BACKEND_RESPONSE",
        message: "Backend response is not a supported graph payload",
        detail: { payload: parsed },
      },
    },
    { status: 502 },
  );
}
