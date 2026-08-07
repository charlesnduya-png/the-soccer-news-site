import { NextResponse } from "next/server";
import { fetchUpcomingMatchesWithLineups } from "@/lib/coach-bolt-engine/fotmob";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const matches = await fetchUpcomingMatchesWithLineups(10);
    return NextResponse.json({ matches });
  } catch (error) {
    console.error("Coach Bolt upcoming error:", error);
    return NextResponse.json({ matches: [] });
  }
}
