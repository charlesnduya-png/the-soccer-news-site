import { NextResponse } from "next/server";
import { recordPageView } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  let body: { path?: string; referrer?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const path = body.path?.trim() ?? "";
  if (!path) {
    return NextResponse.json(
      { error: "path required" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const ok = recordPageView({
    path,
    referrer: body.referrer,
    userAgent: request.headers.get("user-agent") ?? "",
  });

  if (!ok) {
    return NextResponse.json(
      { error: "ignored" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  return new NextResponse(null, {
    status: 204,
    headers: {
      ...CORS_HEADERS,
      "Cache-Control": "no-store",
    },
  });
}
