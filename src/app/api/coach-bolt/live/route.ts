import { NextResponse } from "next/server";
import { getTodayLiveFixtures } from "@/lib/coach-bolt-engine/livegoals";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const fixtures = await getTodayLiveFixtures();
    return NextResponse.json({ fixtures: fixtures.slice(0, 20) });
  } catch (error) {
    console.error("Coach Bolt live error:", error);
    return NextResponse.json({ fixtures: [] });
  }
}
