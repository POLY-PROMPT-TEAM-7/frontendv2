import { NextResponse } from "next/server";

import { deriveBackendCapabilities } from "../../../../lib/kg/capabilities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ErrorPayload = {
  code: string;
  message: string;
  detail?: Record<string, unknown>;
};

type OpenApiProxyFailure = {
  ok: false;
  error?: ErrorPayload;
};

function isFailurePayload(value: unknown): value is OpenApiProxyFailure {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return candidate.ok === false;
}

export async function GET(request: Request) {
  try {
    const openapiUrl = new URL("/api/backend/openapi", request.url);
    const res = await fetch(openapiUrl, { cache: "no-store" });
    const payload = await res.json().catch(() => null);

    if (!res.ok || isFailurePayload(payload)) {
      return NextResponse.json(
        {
          ok: false,
          capabilities: { hasOpenAPI: false },
          error:
            isFailurePayload(payload) && payload.error
              ? payload.error
              : {
                  code: "OPENAPI_UNAVAILABLE",
                  message: "Backend OpenAPI is unavailable",
                },
        },
        { status: 200 },
      );
    }

    const capabilities = deriveBackendCapabilities(payload);
    return NextResponse.json({ ok: true, capabilities }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        capabilities: { hasOpenAPI: false },
        error: {
          code: "CAPABILITIES_ERROR",
          message: "Failed to derive backend capabilities",
          detail: { cause: message },
        },
      },
      { status: 200 },
    );
  }
}
