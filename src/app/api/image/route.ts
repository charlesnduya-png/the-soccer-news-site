import { NextResponse } from "next/server";

export const maxDuration = 15;

const MEMORY_TTL_MS = 1000 * 60 * 30;
const MEMORY_MAX = 120;

type CachedImage = {
  body: ArrayBuffer;
  type: string;
  expiresAt: number;
};

const memoryCache = new Map<string, CachedImage>();

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }

  // Block obvious IPv4 private / loopback / link-local ranges.
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const parts = ipv4.slice(1).map(Number);
    if (parts.some((part) => part > 255)) return true;
    const [a, b] = parts;
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }

  return false;
}

function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    if (isPrivateHostname(parsed.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

function remember(url: string, entry: CachedImage) {
  memoryCache.set(url, entry);
  if (memoryCache.size <= MEMORY_MAX) return;
  const first = memoryCache.keys().next().value;
  if (first) memoryCache.delete(first);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl || !isAllowedImageUrl(rawUrl)) {
    return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
  }

  const cached = memoryCache.get(rawUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return new NextResponse(cached.body, {
      headers: {
        "Content-Type": cached.type,
        "Cache-Control":
          "public, max-age=604800, s-maxage=604800, stale-while-revalidate=2592000",
        "X-Image-Cache": "HIT",
      },
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);

  try {
    const origin = new URL(rawUrl).origin;
    const res = await fetch(rawUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: `${origin}/`,
      },
      redirect: "follow",
      next: { revalidate: 60 * 60 * 24 * 7 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Image unavailable" }, { status: 404 });
    }

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Not an image" }, { status: 415 });
    }

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength < 32) {
      return NextResponse.json({ error: "Image too small" }, { status: 415 });
    }

    remember(rawUrl, {
      body: buffer,
      type: contentType,
      expiresAt: Date.now() + MEMORY_TTL_MS,
    });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control":
          "public, max-age=604800, s-maxage=604800, stale-while-revalidate=2592000",
        "X-Image-Cache": "MISS",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image fetch failed" }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
