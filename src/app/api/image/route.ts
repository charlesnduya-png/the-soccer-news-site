import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

const ALLOWED_HOSTS =
  /(?:^|\.)((?:bbc|bbci|skysports|theguardian|guim|espn|standardmedia|cdn\.standardmedia|cdn\.pulsesports|cdn3\.mozzartsport|sportal365images|tv47|gnews|ytimg|googleusercontent|cloudfront|amazonaws|wp|reuters|goal|dailymotion|premierleague|talksport|mirror|metro|independent|dailymail|thesun|express|liverpoolecho|sportbible|nation|citizen|the-star|cafonline|eurosport|marca|skysportsnews|inews|football365|fourfourtwo|theathletic|nytimes|washingtonpost|apnews|cnn|aljazeera|africanews|capitalfm|mozzartsport|pulsesports|kbc|channelafrica|tuko|mpasho)\.(?:co\.uk|com|ke|io|org|net|africa|digital|media)|.*\.co\.ke|i\.ytimg\.com|lh\d+\.googleusercontent\.com)$/i;

function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return ALLOWED_HOSTS.test(parsed.hostname);
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl || !isAllowedImageUrl(rawUrl)) {
    return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const origin = new URL(rawUrl).origin;
    const res = await fetch(rawUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; soccer.co.ke/1.0; +https://soccer.co.ke)",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: `${origin}/`,
      },
      redirect: "follow",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Image unavailable" }, { status: 404 });
    }

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Not an image" }, { status: 415 });
    }

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image fetch failed" }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
