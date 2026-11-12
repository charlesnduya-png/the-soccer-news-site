import { NextResponse } from "next/server";
import { ALL_NEWS_TOPICS, isNewsTopic } from "@/lib/league-news-config";
import { getNewsSnapshot, type NewsTopic } from "@/lib/news-api";

export const dynamic = "force-dynamic";
/** Cold RSS only — image enrich runs in the background after publish. */
export const maxDuration = 20;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const VALID_TOPICS = new Set<NewsTopic>(ALL_NEWS_TOPICS);

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedLimit = Number(searchParams.get("limit") ?? 24);
  const limit =
    Number.isFinite(requestedLimit) && Number.isInteger(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 50)
      : 24;
  const rawTopic = searchParams.get("topic") ?? "european-leagues";
  const topic: NewsTopic = isNewsTopic(rawTopic) ? rawTopic : "european-leagues";

  const snapshot = await getNewsSnapshot(limit, topic);

  return NextResponse.json(
    {
      count: snapshot.articles.length,
      topic,
      sources: snapshot.successfulSources,
      articles: snapshot.articles,
      fetchedAt: snapshot.fetchedAt,
      newestArticleAt: snapshot.newestArticleAt,
      failedSources: snapshot.failedSources,
      isFallback: snapshot.isFallback,
      degraded: snapshot.degraded,
    },
    {
      headers: {
        ...CORS_HEADERS,
        // Short edge cache — clients still poll every 2 min for freshness.
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    }
  );
}
