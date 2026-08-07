"use client";

import { useMemo, useState } from "react";

const PLACEHOLDER = "/news-placeholder.svg";

function proxiedImageUrl(src: string): string {
  if (src.startsWith("/")) return src;
  if (!src.startsWith("http")) return PLACEHOLDER;
  return `/api/image?url=${encodeURIComponent(src)}`;
}

export function NewsArticleImage({
  src,
  alt = "",
  className = "absolute inset-0 h-full w-full object-cover",
  loading = "lazy" as "lazy" | "eager",
  priority = false,
}: {
  src?: string;
  alt?: string;
  className?: string;
  loading?: "lazy" | "eager";
  priority?: boolean;
}) {
  const candidates = useMemo(() => {
    if (!src) return [PLACEHOLDER];
    const proxied = proxiedImageUrl(src);
    return proxied === src ? [src, PLACEHOLDER] : [proxied, src, PLACEHOLDER];
  }, [src]);

  const [index, setIndex] = useState(0);
  const currentSrc = candidates[Math.min(index, candidates.length - 1)];

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      loading={priority ? "eager" : loading}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        setIndex((value) => Math.min(value + 1, candidates.length - 1));
      }}
    />
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
      return `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`;
    }
  }
  return undefined;
}
