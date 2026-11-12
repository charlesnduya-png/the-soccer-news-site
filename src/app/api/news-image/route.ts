import { NextResponse } from "next/server";
import {
  attachResolvedArticleImage,
  resolveNewsArticleImage,
} from "@/lib/news-api";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS });
}

/**
 * On-demand news thumbnail resolver for the inbuilt image loader.
 * Query: ?link=<articleUrl>&id=<optionalArticleId>&image=<optionalKnownImage>
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const link = searchParams.get("link")?.trim() ?? "";
  const id = searchParams.get("id")?.trim() || undefined;
  const existing = searchParams.get("image")?.trim() || undefined;

  if (!link.startsWith("http")) {
    return NextResponse.json(
      { image: null, error: "Missing article link" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  try {
    const image = await resolveNewsArticleImage(link, existing);
    if (image) {
      attachResolvedArticleImage(id, link, image);
    }

    return NextResponse.json(
      { image: image ?? null },
      {
        headers: {
          ...CORS_HEADERS,
          "Cache-Control": image
            ? "public, s-maxage=600, stale-while-revalidate=3600"
            : "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("news-image resolve failed:", error);
    return NextResponse.json(
      { image: null, error: "Resolve failed" },
      { status: 502, headers: CORS_HEADERS }
    );
  }
}
