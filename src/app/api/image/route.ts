import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

const MEMORY_TTL_MS = 1000 * 60 * 30;
const MEMORY_MAX = 160;

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
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
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

async function fetchImageBytes(rawUrl: string): Promise<{
  body: ArrayBuffer;
  type: string;
} | null> {
  const origin = new URL(rawUrl).origin;
  const attempts: Array<Record<string, string>> = [
    {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      Referer: `${origin}/`,
      "Accept-Language": "en-GB,en;q=0.9",
    },
    {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    },
  ];

  for (const headers of attempts) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    try {
      const res = await fetch(rawUrl, {
        signal: controller.signal,
        headers,
        redirect: "follow",
        cache: "force-cache",
      });
      if (!res.ok) continue;

      const contentType = res.headers.get("content-type") ?? "image/jpeg";
      if (!contentType.startsWith("image/") && !contentType.includes("octet-stream")) {
        continue;
      }

      const buffer = await res.arrayBuffer();
      if (buffer.byteLength < 64) continue;

      return {
        body: buffer,
        type: contentType.startsWith("image/") ? contentType : "image/jpeg",
      };
    } catch {
      // try next header profile
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
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

  const fetched = await fetchImageBytes(rawUrl);
  if (!fetched) {
    return NextResponse.json({ error: "Image unavailable" }, { status: 404 });
  }

  remember(rawUrl, {
    body: fetched.body,
    type: fetched.type,
    expiresAt: Date.now() + MEMORY_TTL_MS,
  });

  return new NextResponse(fetched.body, {
    headers: {
      "Content-Type": fetched.type,
      "Cache-Control":
        "public, max-age=604800, s-maxage=604800, stale-while-revalidate=2592000",
      "X-Image-Cache": "MISS",
    },
  });
}
