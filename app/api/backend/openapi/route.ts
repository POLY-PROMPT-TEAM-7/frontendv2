import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const apiUrl = process.env.API_URL || "http://localhost:8000";
  const url = `${apiUrl.replace(/\/+$/, "")}/openapi.json`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "OPENAPI_UNAVAILABLE",
            message: `Backend returned HTTP ${res.status} for openapi.json`,
            detail: { apiUrl, url, status: res.status },
          },
        },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "BACKEND_UNREACHABLE",
          message: "Unable to reach backend API_URL",
          detail: { apiUrl, url, cause: message },
        },
      },
      { status: 502 }
    );
  }
}
