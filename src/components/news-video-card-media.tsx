"use client";

import { useState } from "react";
import { NewsArticleImage } from "@/components/news-article-image";
import type { VideoEmbed } from "@/lib/news-video";

function PlayButton({ featured }: { featured?: boolean }) {
  return (
    <span
      className={`relative flex items-center justify-center rounded-full bg-[#00ff87] text-[#07060f] shadow-[0_8px_28px_rgba(0,255,135,0.35)] ring-4 ring-white/15 transition duration-300 group-hover:scale-110 group-hover:ring-[#00ff87]/40 ${
        featured
          ? "h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]"
          : "h-12 w-12 sm:h-14 sm:w-14"
      }`}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className={
          featured ? "ml-1 h-7 w-7 sm:h-8 sm:w-8" : "ml-0.5 h-5 w-5 sm:h-6 sm:w-6"
        }
        fill="currentColor"
      >
        <path d="M8 5.14v13.72L19 12 8 5.14z" />
      </svg>
    </span>
  );
}

function autoplaySrc(embed: VideoEmbed): string {
  if (embed.kind === "file") return embed.src;
  const join = embed.src.includes("?") ? "&" : "?";
  return `${embed.src}${join}autoplay=1`;
}

type NewsVideoCardMediaProps = {
  embed: VideoEmbed;
  title: string;
  poster?: string;
  articleLink?: string;
  articleId?: string;
  priority?: boolean;
  featured?: boolean;
  className?: string;
};

/**
 * In-card video player (Aug 20 style): poster + play, then embed plays here.
 */
export function NewsVideoCardMedia({
  embed,
  title,
  poster,
  articleLink,
  articleId,
  priority = false,
  featured = false,
  className = "absolute inset-0",
}: NewsVideoCardMediaProps) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    if (embed.kind === "file") {
      return (
        <div className={`${className} bg-black`}>
          <video
            className="h-full w-full object-contain"
            controls
            playsInline
            autoPlay
            preload="metadata"
            poster={poster}
            title={title}
          >
            <source src={embed.src} />
            Your browser does not support embedded video.
          </video>
        </div>
      );
    }

    return (
      <div className={`${className} bg-black`}>
        <iframe
          src={autoplaySrc(embed)}
          title={title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="origin-when-cross-origin"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className={`${className} group/video block overflow-hidden text-left`}
      aria-label={`Play ${title}`}
    >
      <span className="absolute inset-0 bg-gradient-to-br from-[#37003c] to-[#07060f]">
        <NewsArticleImage
          src={poster}
          articleLink={articleLink}
          articleId={articleId}
          priority={priority}
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover/video:scale-[1.03]"
        />
      </span>
      <span className="absolute inset-0 bg-gradient-to-t from-[#07060f]/85 via-[#07060f]/25 to-transparent" />
      <span className="absolute inset-0 flex items-center justify-center">
        <PlayButton featured={featured} />
      </span>
      <span className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-black/65 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00ff87]" />
          Watch
        </span>
        {embed.kind !== "file" ? (
          <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/70 backdrop-blur-sm">
            {embed.kind}
          </span>
        ) : null}
      </span>
    </button>
  );
}
