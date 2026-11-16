"use client";

import Link from "next/link";
import type { NewsArticle } from "@/lib/types";
import { NewsArticleImage } from "@/components/news-article-image";
import { NewsVideoCardMedia } from "@/components/news-video-card-media";
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

export function NewsCard({ article, featured = false }: NewsCardProps) {
  const embed = article.videoUrl ? toVideoEmbed(article.videoUrl) : null;
  const hasVideo = Boolean(embed);
  const poster =
    videoPosterUrl(article.videoUrl, article.image) ?? article.image;
  const cardDescription = hasVideo
    ? videoDescription(article.title, article.source, article.description)
    : article.description;

  if (hasVideo && embed) {
    return (
      <article
        className={`news-card news-card--video group flex flex-col overflow-hidden rounded-2xl border transition duration-300 hover:-translate-y-1 ${
          featured ? "news-card--featured sm:col-span-2 sm:grid sm:grid-cols-2" : ""
        }`}
      >
        <div
          className={`news-card__media relative overflow-hidden bg-black ${
            featured
              ? "aspect-video sm:aspect-auto sm:min-h-[260px]"
              : "aspect-video"
          }`}
        >
          <NewsVideoCardMedia
            embed={embed}
            title={article.title}
            poster={poster}
            articleLink={article.link}
            articleId={article.id}
            priority={featured}
            featured={featured}
          />
        </div>

        <div
          className={`news-card__body flex flex-1 flex-col p-5 ${
            featured ? "sm:justify-center" : ""
          }`}
        >
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="news-card__source rounded-full px-2 py-0.5 font-semibold">
              {article.source}
            </span>
            <span className="news-card__video-tag rounded-full border px-2 py-0.5 font-semibold uppercase tracking-wide">
              Video
            </span>
            <span className="news-card__date">
              {formatNewsDate(article.pubDate)}
            </span>
          </div>
          <h3
            className={`news-card__title font-bold ${
              featured ? "text-xl sm:text-2xl" : "text-base"
            }`}
          >
            {article.title}
          </h3>
          {cardDescription ? (
            <p className="news-card__excerpt mt-2 line-clamp-3 text-sm leading-6">
              {cardDescription}
            </p>
          ) : null}
          <p className="news-card__cta mt-4 text-sm font-semibold">
            Tap play to watch in this card
          </p>
        </div>
      </article>
    );
  }

  return (
    <Link
      href={`/news/${article.id}`}
      aria-label={`Read ${article.title}`}
      className={`news-card news-card--story group flex flex-col overflow-hidden rounded-2xl border transition duration-300 hover:-translate-y-1 ${
        featured ? "news-card--featured sm:col-span-2 sm:grid sm:grid-cols-2" : ""
      }`}
    >
      <div
        className={`news-card__media relative overflow-hidden ${
          featured
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
        <div className="news-card__shade news-card__shade--story absolute inset-0" />
      </div>

      <div
        className={`news-card__body flex flex-1 flex-col p-5 ${
          featured ? "sm:justify-center" : ""
        }`}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="news-card__source rounded-full px-2 py-0.5 font-semibold">
            {article.source}
          </span>
          <span className="news-card__date">
            {formatNewsDate(article.pubDate)}
          </span>
        </div>
        <h3
          className={`news-card__title font-bold transition ${
            featured ? "text-xl sm:text-2xl" : "text-base"
          }`}
        >
          {article.title}
        </h3>
        {cardDescription ? (
          <p className="news-card__excerpt mt-2 line-clamp-3 text-sm leading-6">
            {cardDescription}
          </p>
        ) : null}
        <span className="news-card__cta mt-4 inline-flex items-center gap-1.5 text-sm font-semibold">
          Open &amp; read
          <span
            aria-hidden
            className="transition-transform group-hover:translate-x-1"
          >
            →
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
