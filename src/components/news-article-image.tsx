"use client";

import { useEffect, useMemo, useState } from "react";
import {
  NEWS_IMAGE_PLACEHOLDER,
  cacheResolvedNewsImage,
  getCachedResolvedNewsImage,
  newsImageCandidates,
} from "@/lib/news-image-loader";

type NewsArticleImageProps = {
  src?: string;
  /** Article page / Google News link — used to resolve a thumbnail when `src` is missing. */
  articleLink?: string;
  articleId?: string;
  alt?: string;
  className?: string;
  loading?: "lazy" | "eager";
  priority?: boolean;
};

export function NewsArticleImage({
  src,
  articleLink,
  articleId,
  alt = "",
  className = "absolute inset-0 h-full w-full object-cover",
  loading = "lazy",
  priority = false,
}: NewsArticleImageProps) {
  const cacheKey = articleId || articleLink || src || "";
  const cached = cacheKey ? getCachedResolvedNewsImage(cacheKey) : undefined;
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(
    src || cached
  );
  const [resolving, setResolving] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setResolvedSrc(src || (cacheKey ? getCachedResolvedNewsImage(cacheKey) : undefined));
    setIndex(0);
  }, [src, cacheKey]);

  // Inbuilt loader: when RSS/GNews left the card without an image, resolve one.
  useEffect(() => {
    if (src || !articleLink?.startsWith("http")) return;
    if (cacheKey && getCachedResolvedNewsImage(cacheKey)) return;

    let cancelled = false;
    const controller = new AbortController();

    async function loadImage() {
      setResolving(true);
      try {
        const params = new URLSearchParams({ link: articleLink as string });
        if (articleId) params.set("id", articleId);

        const res = await fetch(`/api/news-image?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { image?: string | null };
        if (cancelled || !data.image) return;

        if (cacheKey) cacheResolvedNewsImage(cacheKey, data.image);
        setResolvedSrc(data.image);
        setIndex(0);
      } catch {
        // Keep placeholder — loader is best-effort.
      } finally {
        if (!cancelled) setResolving(false);
      }
    }

    void loadImage();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [articleLink, articleId, src, cacheKey]);

  const candidates = useMemo(
    () => newsImageCandidates(resolvedSrc, { priority }),
    [resolvedSrc, priority]
  );

  const advance = () => {
    setIndex((value) => Math.min(value + 1, candidates.length - 1));
  };

  const currentSrc = candidates[Math.min(index, candidates.length - 1)] ?? NEWS_IMAGE_PLACEHOLDER;

  return (
    <span className="news-article-image relative block h-full w-full overflow-hidden bg-[#120c1c]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={`${resolvedSrc ?? "empty"}:${index}`}
        src={currentSrc}
        alt={alt}
        className={className}
        loading={priority ? "eager" : loading}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={advance}
        onLoad={(event) => {
          const image = event.currentTarget;
          if (
            currentSrc.includes("maxresdefault") &&
            (image.naturalWidth < 240 || image.naturalHeight < 140)
          ) {
            advance();
          }
        }}
      />
      {resolving && !resolvedSrc ? (
        <span
          className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-br from-white/5 via-transparent to-[#00ff87]/10"
          aria-hidden
        />
      ) : null}
    </span>
  );
}

export function resolveNewsImage(
  image?: string,
  videoUrl?: string,
  fallbackImage?: string
): string | undefined {
  if (image) return image;
  if (fallbackImage) return fallbackImage;
  if (videoUrl) {
    const match = videoUrl.match(
      /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i
    );
    if (match?.[1]) {
      return `https://i.ytimg.com/vi/${match[1]}/mqdefault.jpg`;
    }
  }
  return undefined;
}
