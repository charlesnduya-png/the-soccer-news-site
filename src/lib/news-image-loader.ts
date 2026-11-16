import type { NewsArticle } from "@/lib/types";

export const NEWS_IMAGE_PLACEHOLDER = "/news-placeholder.svg";

const resolvedImageCache = new Map<
  string,
  { image: string; expiresAt: number }
>();

const resolveInflight = new Map<string, Promise<string | null>>();

const RESOLVE_TTL_MS = 30 * 60 * 1000;

export function isHttpImageUrl(url?: string | null): url is string {
  return Boolean(url && /^https?:\/\//i.test(url));
}

export function isLocalImageUrl(url?: string | null): url is string {
  return Boolean(
    url &&
      (url.startsWith("/api/admin/media/") ||
        url.startsWith("/api/image?") ||
        url.startsWith("/news-placeholder") ||
        url.startsWith("/uploads/"))
  );
}

export function isCacheableImageUrl(url?: string | null): url is string {
  return isHttpImageUrl(url) || isLocalImageUrl(url);
}

/** True when the RSS/GNews thumbnail is likely broken or blocked in browsers. */
export function isFragileNewsImage(url?: string | null): boolean {
  if (!url) return true;
  const value = url;
  if (isLocalImageUrl(value)) return false;
  if (!/^https?:\/\//i.test(value)) return true;
  const lower = value.toLowerCase();
  return (
    lower.includes("news.google.com") ||
    lower.includes("encrypted-tbn") ||
    lower.includes("gstatic.com/images") ||
    lower.includes("googleusercontent.com/news") ||
    lower.includes("lh3.googleusercontent.com") ||
    // Tiny tracking / 1px style assets
    /[=/](1x1|pixel|spacer)\.(gif|png|jpg)/i.test(lower)
  );
}

export function proxyNewsImageUrl(src: string): string {
  if (src.startsWith("/")) return src;
  if (!isHttpImageUrl(src)) return NEWS_IMAGE_PLACEHOLDER;
  return `/api/image?url=${encodeURIComponent(src)}`;
}

export function youtubeThumbCandidates(
  src: string,
  preferHighRes = false
): string[] {
  const yt = src.match(/i\.ytimg\.com\/vi\/([\w-]{11})\//i);
  if (!yt?.[1]) return [src];
  const id = yt[1];
  const mq = `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
  const hq = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  const maxres = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
  const list = preferHighRes ? [maxres, hq, mq, src] : [hq, mq, src];
  return list.filter((value, index, all) => all.indexOf(value) === index);
}

/**
 * Candidate URLs to try in order for a known image src.
 * Prefer our image proxy first so hotlink-blocked publisher CDNs still render.
 */
export function newsImageCandidates(
  src?: string | null,
  options?: { priority?: boolean }
): string[] {
  if (!src) return [NEWS_IMAGE_PLACEHOLDER];
  if (src.startsWith("/api/image?")) return [src, NEWS_IMAGE_PLACEHOLDER];
  if (src.startsWith("/")) return [src, NEWS_IMAGE_PLACEHOLDER];
  if (!isHttpImageUrl(src)) return [NEWS_IMAGE_PLACEHOLDER];

  const base = src.includes("i.ytimg.com/vi/")
    ? youtubeThumbCandidates(src, Boolean(options?.priority))
    : [src];

  const proxied = base.map((url) => proxyNewsImageUrl(url));
  // Proxy first (reliable), then direct, then placeholder.
  const list = [...proxied, ...base, NEWS_IMAGE_PLACEHOLDER];
  return list.filter((value, index, all) => all.indexOf(value) === index);
}

export function cacheResolvedNewsImage(key: string, image: string) {
  if (!key || !isCacheableImageUrl(image)) return;
  resolvedImageCache.set(key, {
    image,
    expiresAt: Date.now() + RESOLVE_TTL_MS,
  });
}

export function getCachedResolvedNewsImage(key: string): string | undefined {
  const hit = resolvedImageCache.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt <= Date.now()) {
    resolvedImageCache.delete(key);
    return undefined;
  }
  return hit.image;
}

export function newsImageCacheKey(article: Pick<NewsArticle, "id" | "link">) {
  return article.id || article.link;
}

/** Shared client resolver — dedupes in-flight requests across cards. */
export function resolveNewsImageClient(options: {
  link: string;
  articleId?: string;
  existingImage?: string;
}): Promise<string | null> {
  const { link, articleId, existingImage } = options;
  if (!link.startsWith("http")) return Promise.resolve(null);

  const key = articleId || link;
  const cached = getCachedResolvedNewsImage(key);
  if (cached) return Promise.resolve(cached);

  const existing = resolveInflight.get(key);
  if (existing) return existing;

  const params = new URLSearchParams({ link });
  if (articleId) params.set("id", articleId);
  if (existingImage && isHttpImageUrl(existingImage) && !isFragileNewsImage(existingImage)) {
    params.set("image", existingImage);
  }

  const promise = fetch(`/api/news-image?${params.toString()}`, {
    cache: "force-cache",
  })
    .then(async (res) => {
      if (!res.ok) return null;
      const data = (await res.json()) as { image?: string | null };
      const image = data.image?.trim() || null;
      if (image) cacheResolvedNewsImage(key, image);
      return image;
    })
    .catch(() => null)
    .finally(() => {
      resolveInflight.delete(key);
    });

  resolveInflight.set(key, promise);
  return promise;
}
