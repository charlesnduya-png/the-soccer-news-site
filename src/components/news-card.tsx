"use client";

import Link from "next/link";
import type { NewsArticle } from "@/lib/types";
import {
  NewsArticleImage,
} from "@/components/news-article-image";
import {
  toVideoEmbed,
  videoDescription,
  videoPosterUrl,
} from "@/lib/news-video";
import { formatNewsDate } from "@/lib/utils";

interface NewsCardProps {
  article: NewsArticle;
  featured?: boolean;
}

function NewsImage({
  src,
  articleLink,
  articleId,
  priority,
}: {
  src?: string;
  articleLink?: string;
  articleId?: string;
  priority?: boolean;
}) {
  return (
    <NewsArticleImage
      src={src}
      articleLink={articleLink}
      articleId={articleId}
      priority={priority}
      className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
    />
  );
}

function PlayButton({ featured }: { featured?: boolean }) {
  return (
    <span
      className={`relative flex items-center justify-center rounded-full bg-[#00ff87] text-[#07060f] shadow-[0_8px_28px_rgba(0,255,135,0.35)] ring-4 ring-white/15 transition duration-300 group-hover:scale-110 group-hover:ring-[#00ff87]/40 ${
        featured ? "h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]" : "h-12 w-12 sm:h-14 sm:w-14"
      }`}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className={featured ? "ml-1 h-7 w-7 sm:h-8 sm:w-8" : "ml-0.5 h-5 w-5 sm:h-6 sm:w-6"}
        fill="currentColor"
      >
        <path d="M8 5.14v13.72L19 12 8 5.14z" />
      </svg>
    </span>
  );
}

export function NewsCard({ article, featured = false }: NewsCardProps) {
  const embed = article.videoUrl ? toVideoEmbed(article.videoUrl) : null;
  const hasVideo = Boolean(embed);
  const poster =
    videoPosterUrl(article.videoUrl, article.image) ?? article.image;
  const cardDescription = hasVideo
    ? videoDescription(article.title, article.source, article.description)
    : article.description;
  const cardHref =
    hasVideo && article.videoUrl
      ? article.videoUrl
      : `/news/${article.id}`;

  return (
    <Link
      href={cardHref}
      target={hasVideo ? "_blank" : undefined}
      rel={hasVideo ? "noopener noreferrer" : undefined}
      aria-label={
        hasVideo
          ? `Watch ${article.title} on ${embed?.kind ?? "video source"}`
          : `Read ${article.title}`
      }
      className={`news-card group flex flex-col overflow-hidden rounded-2xl border transition duration-300 hover:-translate-y-1 ${
        hasVideo ? "news-card--video" : "news-card--story"
      } ${featured ? "news-card--featured sm:col-span-2 sm:grid sm:grid-cols-2" : ""}`}
    >
      <div
        className={`news-card__media relative overflow-hidden ${
          hasVideo
            ? "aspect-video"
            : featured
              ? "aspect-[16/10] sm:aspect-auto sm:min-h-[260px]"
              : "aspect-video"
        }`}
      >
        <NewsImage
          src={poster}
          articleLink={article.link}
          articleId={article.id}
          priority={featured}
        />

        <div
          className={`news-card__shade absolute inset-0 ${
            hasVideo ? "news-card__shade--video" : "news-card__shade--story"
          }`}
        />

        {hasVideo ? (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <PlayButton featured={featured} />
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-black/65 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00ff87]" />
                Watch
              </span>
              {embed?.kind && embed.kind !== "file" ? (
                <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/70 backdrop-blur-sm">
                  {embed.kind}
                </span>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      <div className={`news-card__body flex flex-1 flex-col p-5 ${featured ? "sm:justify-center" : ""}`}>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="news-card__source rounded-full px-2 py-0.5 font-semibold">
            {article.source}
          </span>
          {hasVideo ? (
            <span className="news-card__video-tag rounded-full border px-2 py-0.5 font-semibold uppercase tracking-wide">
              Video
            </span>
          ) : null}
          <span className="news-card__date">{formatNewsDate(article.pubDate)}</span>
        </div>
        <h3
          className={`news-card__title font-bold transition ${
            featured ? "text-xl sm:text-2xl" : "text-base"
          }`}
        >
          {article.title}
        </h3>
        {cardDescription && (
          <p className="news-card__excerpt mt-2 line-clamp-3 text-sm leading-6">
            {cardDescription}
          </p>
        )}
        <span className="news-card__cta mt-4 inline-flex items-center gap-1.5 text-sm font-semibold">
          {hasVideo ? "Watch video now" : "Open & read"}
          <span
            aria-hidden
            className="transition-transform group-hover:translate-x-1"
          >
            {hasVideo ? "↗" : "→"}
          </span>
        </span>
      </div>
    </Link>
  );
}

interface NewsGridProps {
  articles: NewsArticle[];
}

export function NewsGrid({ articles }: NewsGridProps) {
  if (articles.length === 0) {
    return (
      <div className="news-empty rounded-xl border px-6 py-12 text-center">
        No news articles available right now.
      </div>
    );
  }

  const [featured, ...rest] = articles;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <NewsCard article={featured} featured />
      {rest.map((article) => (
        <NewsCard key={article.id} article={article} />
      ))}
    </div>
  );
}
