import type { NewsArticle } from "@/lib/types";

export const NEWS_IMAGE_PLACEHOLDER = "/news-placeholder.svg";

const resolvedImageCache = new Map<
  string,
  { image: string; expiresAt: number }
>();

const RESOLVE_TTL_MS = 30 * 60 * 1000;

export function isHttpImageUrl(url?: string | null): url is string {
  return Boolean(url && /^https?:\/\//i.test(url));
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
  const maxres = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
  const list = preferHighRes ? [maxres, mq, src] : [mq, src];
  return list.filter((value, index, all) => all.indexOf(value) === index);
}

/** Candidate URLs to try in order for a known image src. */
export function newsImageCandidates(
  src?: string | null,
  options?: { priority?: boolean }
): string[] {
  if (!src) return [NEWS_IMAGE_PLACEHOLDER];
  if (src.startsWith("/")) return [src, NEWS_IMAGE_PLACEHOLDER];
  if (!isHttpImageUrl(src)) return [NEWS_IMAGE_PLACEHOLDER];

  const base = src.includes("i.ytimg.com/vi/")
    ? youtubeThumbCandidates(src, Boolean(options?.priority))
    : [src];

  const list = [
    ...base,
    ...base.map((url) => proxyNewsImageUrl(url)),
    NEWS_IMAGE_PLACEHOLDER,
  ];
  return list.filter((value, index, all) => all.indexOf(value) === index);
}

export function cacheResolvedNewsImage(key: string, image: string) {
  if (!key || !isHttpImageUrl(image)) return;
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
