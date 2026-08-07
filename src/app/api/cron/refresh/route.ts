import { NextResponse } from "next/server";
import { warmSiteData } from "@/lib/site-autopilot";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Open in local/dev only — set CRON_SECRET in production
    return process.env.NODE_ENV !== "production";
  }

  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  const pulse = await warmSiteData(true);
  return NextResponse.json(
    {
      message: "Site autopilot refresh complete",
      pulse,
    },
    { headers: CORS_HEADERS }
  );
}

export async function POST(request: Request) {
  return GET(request);
}
