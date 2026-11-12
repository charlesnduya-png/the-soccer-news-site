import { NextResponse } from "next/server";
import { getMatchBoard } from "@/lib/football-api";

export const dynamic = "force-dynamic";
export const revalidate = 30;

export async function GET() {
  try {
    const board = await getMatchBoard();
    return NextResponse.json(
      {
        live: board.live.slice(0, 12),
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40",
        },
      }
    );
  } catch (error) {
    console.error("Live scores API error:", error);
    return NextResponse.json({
      live: [],
      fetchedAt: new Date().toISOString(),
    });
  }
}
