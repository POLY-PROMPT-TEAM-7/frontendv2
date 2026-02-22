import { NextResponse } from "next/server";

import {
  isKnowledgeGraphPayload,
  isRendererGraphPayload,
  studyOntologyToRendererGraph,
} from "../../../../../lib/kg/adapters/studyOntologyToRenderer";
import { type Capabilities } from "../../../../../lib/kg/capabilities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ graphId: string }>;
};

function getBackendBaseUrl(): string {
  return (process.env.API_URL || "http://localhost:8000").replace(/\/+$/, "");
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
          message: "Capabilities response is invalid",
        },
      };
    }

    if ((payload as { ok?: boolean }).ok !== true) {
      return {
        ok: false,
        error: (payload as { error?: Record<string, unknown> }).error ?? {
          code: "CAPABILITIES_UNAVAILABLE",
          message: "Cannot resolve backend capabilities",
        },
      };
    }

    const capabilities = (payload as { capabilities?: Capabilities })
      .capabilities;
    if (!capabilities) {
      return {
        ok: false,
        error: {
          code: "CAPABILITIES_INVALID",
          message: "Capabilities missing",
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
        message: "Unable to load backend capabilities",
        detail: { cause: message },
      },
    };
  }
}

function parsePayload(contentType: string | null, body: string): unknown {
  if (contentType?.toLowerCase().includes("application/json")) {
    return JSON.parse(body);
  }

  try {
    return JSON.parse(body);
  } catch {
    return { raw: body };
  }
}

export async function GET(request: Request, { params }: Params) {
  const { graphId } = await params;

  if (graphId.startsWith("local-")) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "LOCAL_GRAPH_ONLY",
          message:
            "Local graph ids are stored in browser sessionStorage and cannot be fetched server-side.",
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
          message: "Cannot determine backend graph endpoint",
        },
      },
      { status: 502 },
    );
  }

  const endpoint = capsResult.capabilities.graphGetEndpoint;
  if (!endpoint) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "BACKEND_MISSING_GRAPH_ENDPOINT",
          message: "Backend does not advertise a graph GET endpoint",
          detail: { capabilities: capsResult.capabilities },
        },
      },
      { status: 400 },
    );
  }

  const encodedId = encodeURIComponent(graphId);
  const path = endpoint.pathTemplate.replace(
    `{${endpoint.idParam}}`,
    encodedId,
  );
  const backendUrl = `${getBackendBaseUrl()}${path}`;

  let backendResponse: Response;
  try {
    backendResponse = await fetch(backendUrl, {
      method: "GET",
      cache: "no-store",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "BACKEND_UNREACHABLE",
          message: "Unable to fetch graph from backend",
          detail: { backendUrl, cause: message },
        },
      },
      { status: 502 },
    );
  }

  const rawBody = await backendResponse.text();
  const parsed = parsePayload(
    backendResponse.headers.get("content-type"),
    rawBody,
  );

  if (!backendResponse.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "BACKEND_GRAPH_FETCH_FAILED",
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

  if (isRendererGraphPayload(parsed)) {
    return NextResponse.json(
      {
        ok: true,
        graphId,
        graph: null,
        rendererGraph: parsed,
      },
      { status: 200 },
    );
  }

  if (isKnowledgeGraphPayload(parsed)) {
    return NextResponse.json(
      {
        ok: true,
        graphId,
        graph: parsed,
        rendererGraph: studyOntologyToRendererGraph(parsed),
      },
      { status: 200 },
    );
  }

  if (parsed && typeof parsed === "object") {
    const payload = parsed as Record<string, unknown>;
    if (payload.graph && isKnowledgeGraphPayload(payload.graph)) {
      return NextResponse.json(
        {
          ok: true,
          graphId,
          graph: payload.graph,
          rendererGraph: studyOntologyToRendererGraph(payload.graph),
        },
        { status: 200 },
      );
    }

    if (payload.graph && isRendererGraphPayload(payload.graph)) {
      return NextResponse.json(
        {
          ok: true,
          graphId,
          graph: null,
          rendererGraph: payload.graph,
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
        message: "Backend graph payload is unsupported",
        detail: { payload: parsed },
      },
    },
    { status: 502 },
  );
}
