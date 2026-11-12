import { NextResponse } from "next/server";
import { getConnectedApis, getSiteControllers } from "@/lib/api-config";
import {
  getPulseSnapshot,
  isPulseStale,
  warmSiteData,
} from "@/lib/site-autopilot";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS });
}

/** Public status of the site autopilot. Kicks a background warm when stale. */
export async function GET() {
  const stale = isPulseStale();
  if (stale) {
    // Never block page autopilot polls on a full news+football warm.
    void warmSiteData();
  }

  return NextResponse.json(
    {
      mode: "autopilot",
      pulse: getPulseSnapshot(),
      stale,
      connectedApis: getConnectedApis(),
      controllers: getSiteControllers(),
    },
    {
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "private, no-store",
      },
    }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "Refreshes are accepted only by the authenticated cron endpoint." },
    { status: 405, headers: CORS_HEADERS }
  );
}
