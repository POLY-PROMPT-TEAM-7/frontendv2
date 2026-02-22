import { NextResponse } from "next/server";

import {
  backendRelationshipsToRendererGraph,
  backendSubgraphToRendererGraph,
} from "../../../../lib/kg/adapters/backendSubgraphToRenderer";
import type { RendererGraph } from "../../../../lib/kg/adapters/studyOntologyToRenderer";
import { type Capabilities } from "../../../../lib/kg/capabilities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
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

function getBackendBaseUrl(): string {
  return (process.env.API_URL || "http://localhost:8000").replace(/\/+$/, "");
}

function parseBackendPayload(contentType: string | null, body: string): unknown {
  if (contentType?.toLowerCase().includes("application/json")) {
    return JSON.parse(body);
  }

  try {
    return JSON.parse(body);
  } catch {
    return { raw: body };
  }
}

function toRecord(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== "object") return null;
  return input as Record<string, unknown>;
}

function toStringId(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
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

    const capabilities = (payload as { capabilities?: Capabilities }).capabilities;
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
  return formData.getAll("files").filter((entry): entry is File => entry instanceof File);
}

function validateFiles(files: File[]): { ok: true } | { ok: false; code: string; message: string } {
  if (files.length === 0) {
    return {
      ok: false,
      code: "NO_FILES",
      message: "Please add a file",
    };
  }

  if (files.length > 1) {
    return {
      ok: false,
      code: "MULTI_FILE_UNSUPPORTED",
      message: "Backend accepts one file per upload.",
    };
  }

  const file = files[0];
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
      message: `File exceeds 20MB limit: ${file.name}`,
    };
  }

  return { ok: true };
}

function parseErrorPayload(response: Response, rawBody: string): unknown {
  return parseBackendPayload(response.headers.get("content-type"), rawBody);
}

function readBooleanEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (!raw) return fallback;
  const normalized = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

async function fetchBackendJson(
  url: string,
  method: string,
): Promise<
  | { ok: true; payload: unknown }
  | { ok: false; status?: number; payload?: unknown; reason?: string }
> {
  try {
    const response = await fetch(url, {
      method,
      cache: "no-store",
    });
    const text = await response.text();
    const payload = parseBackendPayload(response.headers.get("content-type"), text);
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        payload,
      };
    }
    return { ok: true, payload };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { ok: false, reason };
  }
}

export async function POST(request: Request) {
  const incomingForm = await request.formData();
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

  const {
    uploadMultipartEndpoint,
    extractJsonEndpoint,
    subgraphBySourceEndpoint,
    relationshipsListEndpoint,
  } =
    capsResult.capabilities;

  if (
    !uploadMultipartEndpoint ||
    !extractJsonEndpoint ||
    (!subgraphBySourceEndpoint && !relationshipsListEndpoint)
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "BACKEND_MISSING_UPLOAD_SUPPORT",
          message: "Backend did not advertise required upload/extract/subgraph endpoints.",
          detail: {
            hasUpload: Boolean(uploadMultipartEndpoint),
            hasExtract: Boolean(extractJsonEndpoint),
            hasSubgraph: Boolean(subgraphBySourceEndpoint),
            hasRelationships: Boolean(relationshipsListEndpoint),
          },
        },
      },
      { status: 400 },
    );
  }

  const backendBaseUrl = getBackendBaseUrl();
  const file = files[0];

  const uploadUrl = `${backendBaseUrl}${uploadMultipartEndpoint.path}`;
  const uploadForm = new FormData();
  uploadForm.append(uploadMultipartEndpoint.fileField, file, file.name);

  let uploadResponse: Response;
  try {
    uploadResponse = await fetch(uploadUrl, {
      method: uploadMultipartEndpoint.method.toUpperCase(),
      body: uploadForm,
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
          detail: { uploadUrl, cause: message },
        },
      },
      { status: 502 },
    );
  }

  if (!uploadResponse.ok) {
    const rawBody = await uploadResponse.text();
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "BACKEND_REQUEST_FAILED",
          message: `Upload endpoint returned HTTP ${uploadResponse.status}`,
          detail: {
            uploadUrl,
            status: uploadResponse.status,
            payload: parseErrorPayload(uploadResponse, rawBody),
          },
        },
      },
      { status: 502 },
    );
  }

  const uploadPayload = toRecord(await uploadResponse.json().catch(() => null));
  const artifactPath = uploadPayload ? toStringId(uploadPayload.artifact_path) : null;
  const sourceId =
    uploadPayload && (toStringId(uploadPayload.source_id) ?? toStringId(uploadPayload.id));

  if (!artifactPath || !sourceId) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "UNSUPPORTED_BACKEND_RESPONSE",
          message: "Upload response missing artifact_path or source_id",
          detail: { payload: uploadPayload },
        },
      },
      { status: 502 },
    );
  }

  const extractUrl = `${backendBaseUrl}${extractJsonEndpoint.path}`;
  const queryCanvas = readBooleanEnv("KG_QUERY_CANVAS", true);
  const queryOpenalex = readBooleanEnv("KG_QUERY_OPENALEX", true);
  let extractResponse: Response;
  try {
    extractResponse = await fetch(extractUrl, {
      method: extractJsonEndpoint.method.toUpperCase(),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [extractJsonEndpoint.requestField]: artifactPath,
        query_canvas: queryCanvas,
        query_openalex: queryOpenalex,
      }),
      cache: "no-store",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "BACKEND_UNREACHABLE",
          message: "Unable to contact backend extract endpoint",
          detail: { extractUrl, cause: message },
        },
      },
      { status: 502 },
    );
  }

  if (!extractResponse.ok) {
    const rawBody = await extractResponse.text();
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "BACKEND_REQUEST_FAILED",
          message: `Extract endpoint returned HTTP ${extractResponse.status}`,
          detail: {
            extractUrl,
            status: extractResponse.status,
            payload: parseErrorPayload(extractResponse, rawBody),
          },
        },
      },
      { status: 502 },
    );
  }

  let rendererGraph: RendererGraph = { nodes: [], links: [] };
  const materializationErrors: Array<Record<string, unknown>> = [];

  if (subgraphBySourceEndpoint) {
    const subgraphPath = subgraphBySourceEndpoint.pathTemplate.replace(
      `{${subgraphBySourceEndpoint.sourceIdParam}}`,
      encodeURIComponent(sourceId),
    );
    const subgraphUrl = `${backendBaseUrl}${subgraphPath}`;
    const subgraphResult = await fetchBackendJson(subgraphUrl, "GET");
    if (subgraphResult.ok) {
      rendererGraph = backendSubgraphToRendererGraph(subgraphResult.payload);
    } else {
      materializationErrors.push({
        endpoint: "subgraph",
        url: subgraphUrl,
        status: subgraphResult.status,
        payload: subgraphResult.payload,
        cause: subgraphResult.reason,
      });
    }
  }

  if (rendererGraph.nodes.length === 0 && relationshipsListEndpoint) {
    const relationshipsUrl = `${backendBaseUrl}${relationshipsListEndpoint.path}?limit=1000&offset=0`;
    const relationshipsResult = await fetchBackendJson(relationshipsUrl, "GET");
    if (relationshipsResult.ok) {
      rendererGraph = backendRelationshipsToRendererGraph(relationshipsResult.payload);
    } else {
      materializationErrors.push({
        endpoint: "relationships",
        url: relationshipsUrl,
        status: relationshipsResult.status,
        payload: relationshipsResult.payload,
        cause: relationshipsResult.reason,
      });
    }
  }

  if (rendererGraph.nodes.length === 0 && materializationErrors.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "BACKEND_REQUEST_FAILED",
          message:
            "Backend graph materialization failed for all advertised endpoints",
          detail: {
            attempts: materializationErrors,
          },
        },
      },
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      mode: "remote",
      graphId: sourceId,
      graph: null,
      rendererGraph,
    },
    { status: 200 },
  );
}
