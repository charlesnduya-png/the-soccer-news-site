"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  NEWS_IMAGE_PLACEHOLDER,
  cacheResolvedNewsImage,
  getCachedResolvedNewsImage,
  isFragileNewsImage,
  newsImageCandidates,
  resolveNewsImageClient,
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
  const initial = cached || (src && !isFragileNewsImage(src) ? src : undefined);
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(initial);
  const [resolving, setResolving] = useState(false);
  const [index, setIndex] = useState(0);
  const resolveAttemptKey = useRef<string>("");

  useEffect(() => {
    const nextCached = cacheKey
      ? getCachedResolvedNewsImage(cacheKey)
      : undefined;
    setResolvedSrc(
      nextCached || (src && !isFragileNewsImage(src) ? src : undefined)
    );
    setIndex(0);
    resolveAttemptKey.current = "";
  }, [src, cacheKey]);

  // Resolve publisher thumbnails for missing / fragile RSS images (esp. Google News).
  useEffect(() => {
    if (!articleLink?.startsWith("http")) return;

    const attemptKey = `${cacheKey}|${src ?? ""}`;
    if (resolveAttemptKey.current === attemptKey) return;

    const hasGoodSrc = Boolean(src && !isFragileNewsImage(src));
    const hasCached = Boolean(cacheKey && getCachedResolvedNewsImage(cacheKey));
    if (hasGoodSrc || hasCached) {
      resolveAttemptKey.current = attemptKey;
      return;
    }

    resolveAttemptKey.current = attemptKey;
    let cancelled = false;

    async function loadImage() {
      setResolving(true);
      try {
        const image = await resolveNewsImageClient({
          link: articleLink as string,
          articleId,
          existingImage: src,
        });
        if (cancelled || !image) return;
        if (cacheKey) cacheResolvedNewsImage(cacheKey, image);
        setResolvedSrc(image);
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
    };
  }, [articleLink, articleId, src, cacheKey]);

  const candidates = useMemo(
    () => newsImageCandidates(resolvedSrc, { priority }),
    [resolvedSrc, priority]
  );

  const advance = () => {
    setIndex((value) => {
      const next = Math.min(value + 1, candidates.length - 1);
      const atPlaceholder =
        next === candidates.length - 1 &&
        candidates[next] === NEWS_IMAGE_PLACEHOLDER;

      if (atPlaceholder && articleLink?.startsWith("http")) {
        void resolveNewsImageClient({
          link: articleLink,
          articleId,
          existingImage: src,
        }).then((image) => {
          if (!image) return;
          if (cacheKey) cacheResolvedNewsImage(cacheKey, image);
          setResolvedSrc(image);
          setIndex(0);
        });
      }
      return next;
    });
  };

  const currentSrc =
    candidates[Math.min(index, candidates.length - 1)] ?? NEWS_IMAGE_PLACEHOLDER;

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
      {resolving && (!resolvedSrc || currentSrc === NEWS_IMAGE_PLACEHOLDER) ? (
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
  if (image && !isFragileNewsImage(image)) return image;
  if (fallbackImage && !isFragileNewsImage(fallbackImage)) return fallbackImage;
  if (videoUrl) {
    const match = videoUrl.match(
      /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i
    );
    if (match?.[1]) {
      return `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`;
    }
  }
  return undefined;
}
