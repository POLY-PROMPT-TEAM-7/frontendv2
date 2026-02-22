import { NextResponse } from "next/server";

import {
  isKnowledgeGraphPayload,
  isRendererGraphPayload,
  studyOntologyToRendererGraph,
} from "../../../../../lib/kg/adapters/studyOntologyToRenderer";
import {
  backendRelationshipsToRendererGraph,
  backendSubgraphToRendererGraph,
} from "../../../../../lib/kg/adapters/backendSubgraphToRenderer";
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
    const body = await response.text();
    const payload = parsePayload(response.headers.get("content-type"), body);
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

  const subgraphEndpoint = capsResult.capabilities.subgraphBySourceEndpoint;
  const relationshipsEndpoint = capsResult.capabilities.relationshipsListEndpoint;
  const graphEndpoint = capsResult.capabilities.graphGetEndpoint;

  if (!subgraphEndpoint && !relationshipsEndpoint && !graphEndpoint) {
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

  const backendBase = getBackendBaseUrl();

  const attempts: Array<Record<string, unknown>> = [];

  if (subgraphEndpoint) {
    const subgraphPath = subgraphEndpoint.pathTemplate.replace(
      `{${subgraphEndpoint.sourceIdParam}}`,
      encodeURIComponent(graphId),
    );
    const subgraphUrl = `${backendBase}${subgraphPath}`;
    const subgraphResult = await fetchBackendJson(subgraphUrl, "GET");

    if (subgraphResult.ok) {
      return NextResponse.json(
        {
          ok: true,
          graphId,
          graph: null,
          rendererGraph: backendSubgraphToRendererGraph(subgraphResult.payload),
        },
        { status: 200 },
      );
    }

    attempts.push({
      endpoint: "subgraph",
      backendUrl: subgraphUrl,
      status: subgraphResult.status,
      payload: subgraphResult.payload,
      cause: subgraphResult.reason,
    });
  }

  if (relationshipsEndpoint) {
    const relationshipsUrl = `${backendBase}${relationshipsEndpoint.path}?limit=1000&offset=0`;
    const relationshipsResult = await fetchBackendJson(relationshipsUrl, "GET");
    if (relationshipsResult.ok) {
      return NextResponse.json(
        {
          ok: true,
          graphId,
          graph: null,
          rendererGraph: backendRelationshipsToRendererGraph(
            relationshipsResult.payload,
          ),
        },
        { status: 200 },
      );
    }

    attempts.push({
      endpoint: "relationships",
      backendUrl: relationshipsUrl,
      status: relationshipsResult.status,
      payload: relationshipsResult.payload,
      cause: relationshipsResult.reason,
    });
  }

  if (!graphEndpoint) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "BACKEND_GRAPH_FETCH_FAILED",
          message:
            "Backend graph materialization failed for all advertised endpoints",
          detail: { attempts },
        },
      },
      { status: 502 },
    );
  }

  const encodedId = encodeURIComponent(graphId);
  const path = graphEndpoint.pathTemplate.replace(
    `{${graphEndpoint.idParam}}`,
    encodedId,
  );
  const backendUrl = `${backendBase}${path}`;

  const graphResult = await fetchBackendJson(backendUrl, "GET");
  if (!graphResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "BACKEND_GRAPH_FETCH_FAILED",
          message:
            "Backend graph materialization failed for all advertised endpoints",
          detail: {
            attempts: [
              ...attempts,
              {
                endpoint: "legacyGraph",
                backendUrl,
                status: graphResult.status,
                payload: graphResult.payload,
                cause: graphResult.reason,
              },
            ],
          },
        },
      },
      { status: 502 },
    );
  }

  const parsed = graphResult.payload;

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
