"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import { NewsArticleImage } from "@/components/news-article-image";
import {
  isFragileNewsImage,
  resolveNewsImageClient,
} from "@/lib/news-image-loader";
import type { NewsArticle } from "@/lib/types";
import {
  toVideoEmbed,
  videoDescription,
  videoPosterUrl,
} from "@/lib/news-video";
import { formatNewsDate } from "@/lib/utils";

interface HomeNewsProps {
  initialArticles?: NewsArticle[];
  limit?: number;
}

function ArticleImage({
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
      className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
    />
  );
}

function MetaRow({
  article,
  hasVideo,
  light,
}: {
  article: NewsArticle;
  hasVideo: boolean;
  light?: boolean;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]">
      <span className={light ? "text-[#00ff87]" : "text-[#00ff87]"}>{article.source}</span>
      {hasVideo ? (
        <span className={light ? "text-white/70" : "text-white/50"}>· Watch</span>
      ) : null}
      <span className={light ? "text-white/55" : "text-white/40"}>
        {formatNewsDate(article.pubDate)}
      </span>
    </div>
  );
}

function FeaturedHero({ article }: { article: NewsArticle }) {
  const embed = article.videoUrl ? toVideoEmbed(article.videoUrl) : null;
  const hasVideo = Boolean(embed);
  const poster =
    videoPosterUrl(article.videoUrl, article.image) ?? article.image;
  const description = hasVideo
    ? videoDescription(article.title, article.source, article.description)
    : article.description;

  return (
    <Link
      href={hasVideo && article.videoUrl ? article.videoUrl : `/news/${article.id}`}
      target={hasVideo ? "_blank" : undefined}
      rel={hasVideo ? "noopener noreferrer" : undefined}
      className="group relative block min-h-[300px] overflow-hidden sm:min-h-[400px] lg:min-h-[460px]"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#37003c] to-[#07060f]">
        <ArticleImage
          src={poster}
          articleLink={article.link}
          articleId={article.id}
          priority
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#07060f]/80 via-[#07060f]/25 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#07060f]/45 via-transparent to-transparent" />

      <div className="relative flex h-full min-h-[300px] flex-col justify-end p-6 sm:min-h-[400px] sm:p-8 lg:min-h-[460px] lg:p-9">
        <MetaRow article={article} hasVideo={hasVideo} light />
        <h2 className="max-w-3xl font-[family-name:var(--font-bebas)] text-4xl leading-[0.95] tracking-wide text-white transition group-hover:text-[#00ff87] sm:text-5xl lg:text-6xl">
          {article.title}
        </h2>
        {description ? (
          <p className="mt-3 max-w-2xl line-clamp-2 text-sm text-white/65 sm:text-base">
            {description}
          </p>
        ) : null}
        <span className="mt-5 inline-flex w-fit items-center gap-2 text-sm font-bold text-[#00ff87]">
          {hasVideo ? "Watch video now" : "Read story"}
          <span aria-hidden className="transition group-hover:translate-x-0.5">
            {hasVideo ? "↗" : "→"}
          </span>
        </span>
      </div>
    </Link>
  );
}

function SecondaryStory({ article }: { article: NewsArticle }) {
  const embed = article.videoUrl ? toVideoEmbed(article.videoUrl) : null;
  const hasVideo = Boolean(embed);
  const poster =
    videoPosterUrl(article.videoUrl, article.image) ?? article.image;
  const description = hasVideo
    ? videoDescription(article.title, article.source, article.description)
    : article.description;

  return (
    <Link
      href={hasVideo && article.videoUrl ? article.videoUrl : `/news/${article.id}`}
      target={hasVideo ? "_blank" : undefined}
      rel={hasVideo ? "noopener noreferrer" : undefined}
      className="group grid grid-cols-[7.5rem_1fr] gap-3 overflow-hidden sm:grid-cols-[9rem_1fr] sm:gap-4"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#37003c] to-[#07060f]">
        <ArticleImage
          src={poster}
          articleLink={article.link}
          articleId={article.id}
        />
        <div className="absolute inset-0 bg-black/10 transition group-hover:bg-black/0" />
      </div>
      <div className="flex flex-col justify-center py-0.5">
        <MetaRow article={article} hasVideo={hasVideo} />
        <h3 className="text-base font-bold leading-snug text-white transition group-hover:text-[#00ff87] sm:text-lg">
          {article.title}
        </h3>
        {description ? (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/45">
            {description}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function FeatureCard({ article }: { article: NewsArticle }) {
  const embed = article.videoUrl ? toVideoEmbed(article.videoUrl) : null;
  const hasVideo = Boolean(embed);
  const poster =
    videoPosterUrl(article.videoUrl, article.image) ?? article.image;
  const description = hasVideo
    ? videoDescription(article.title, article.source, article.description)
    : article.description;

  return (
    <Link
      href={hasVideo && article.videoUrl ? article.videoUrl : `/news/${article.id}`}
      target={hasVideo ? "_blank" : undefined}
      rel={hasVideo ? "noopener noreferrer" : undefined}
      className="group flex flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] transition hover:border-[#00ff87]/25 hover:bg-white/[0.04]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#37003c] to-[#07060f]">
        <ArticleImage
          src={poster}
          articleLink={article.link}
          articleId={article.id}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07060f]/60 via-transparent to-transparent" />
        {hasVideo ? (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 bg-[#00ff87] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#07060f]">
            Watch
          </span>
        ) : null}
      </div>
      <div className="p-4 pt-3">
        <MetaRow article={article} hasVideo={hasVideo} />
        <h3 className="text-lg font-bold leading-snug text-white transition group-hover:text-[#00ff87]">
          {article.title}
        </h3>
        {description ? (
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/50">
            {description}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function HomeNewsSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="grid gap-0 lg:grid-cols-5">
        <div className="min-h-[320px] bg-white/5 sm:min-h-[420px] lg:col-span-3 lg:min-h-[480px]" />
        <div className="space-y-6 border-t border-white/10 p-5 lg:col-span-2 lg:border-l lg:border-t-0 lg:p-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[7.5rem_1fr] gap-3">
              <div className="aspect-[4/3] bg-white/5" />
              <div className="space-y-2 py-2">
                <div className="h-3 w-24 bg-white/10" />
                <div className="h-4 w-full bg-white/10" />
                <div className="h-4 w-3/4 bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-center text-sm text-white/40">Loading European football news…</p>
    </div>
  );
}

export function HomeNews({ initialArticles = [], limit = 12 }: HomeNewsProps) {
  const [articles, setArticles] = useState<NewsArticle[]>(initialArticles);
  const [loading, setLoading] = useState(initialArticles.length === 0);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const imagePrefetchDone = useRef(new Set<string>());
  const seededFromServer = useRef(initialArticles.length > 0);

  // Seed once from SSR. Do not re-apply on every router.refresh() — that was
  // overwriting the 2-minute client poll with the same ISR snapshot.
  useEffect(() => {
    if (seededFromServer.current) return;
    if (initialArticles.length === 0) return;
    seededFromServer.current = true;
    setArticles(initialArticles);
    setLoading(false);
  }, [initialArticles]);

  // Prefetch missing Google News thumbnails for visible homepage cards.
  useEffect(() => {
    const missing = articles
      .filter(
        (article) =>
          !imagePrefetchDone.current.has(article.id) &&
          article.link.startsWith("http") &&
          (!article.image || isFragileNewsImage(article.image))
      )
      .slice(0, 12);

    if (missing.length === 0) return;
    for (const article of missing) {
      imagePrefetchDone.current.add(article.id);
    }

    let cancelled = false;
    void Promise.all(
      missing.map(async (article) => {
        const image = await resolveNewsImageClient({
          link: article.link,
          articleId: article.id,
          existingImage: article.image,
        });
        if (cancelled || !image) return;
        setArticles((current) =>
          current.map((item) =>
            item.id === article.id &&
            (!item.image || isFragileNewsImage(item.image))
              ? { ...item, image }
              : item
          )
        );
      })
    );

    return () => {
      cancelled = true;
    };
  }, [articles]);

  const { updatedAt: polledAt } = useLiveRefresh<{
    articles: NewsArticle[];
    fetchedAt?: string;
    isFallback?: boolean;
    degraded?: boolean;
  }>({
    url: `/api/news?limit=${limit}&topic=european-leagues`,
    intervalMs: 2 * 60 * 1000,
    // Same as the Aug 20 zip: keep polling so the river keeps moving.
    immediate: true,
    onData: (data) => {
      setFetchedAt(data.fetchedAt ?? new Date().toISOString());
      setLoading(false);

      if (!data.articles?.length) return;

      setArticles((current) => {
        // Keep the current feed if a refresh returns empty/fallback junk.
        if (data.isFallback && current.length > 0 && data.articles.length < 3) {
          return current;
        }

        // Carry forward thumbnails when a refresh briefly returns image-less cards.
        const previousById = new Map(
          current
            .filter(
              (article) =>
                article.image && !isFragileNewsImage(article.image)
            )
            .map((article) => [article.id, article.image as string])
        );
        const previousByLink = new Map(
          current
            .filter(
              (article) =>
                article.image && !isFragileNewsImage(article.image)
            )
            .map((article) => [article.link, article.image as string])
        );

        // Keep API newest-first order (Aug 20 river), only patch missing images.
        return data.articles.map((article) => {
          if (article.image && !isFragileNewsImage(article.image)) {
            return article;
          }
          const image =
            previousById.get(article.id) ?? previousByLink.get(article.link);
          return image ? { ...article, image } : article;
        });
      });
    },
  });

  if (loading && articles.length === 0) {
    return <HomeNewsSkeleton />;
  }

  if (articles.length === 0) {
    return (
      <div className="home-empty-state border border-white/10 bg-[#110c1c]/50 px-6 py-12 text-center text-white/50">
        No European football news available right now.
      </div>
    );
  }

  // Aug 20 layout: API order is already newest → older down the page.
  const [hero, ...rest] = articles;
  const secondary = rest.slice(0, 3);
  const features = rest.slice(3, Math.max(3, limit - 1));

  return (
    <section className="home-news" aria-label="European football news">
      <div className="home-news__toolbar mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="home-section-header__eyebrow mb-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00ff87]/85">
            Top stories
          </p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl leading-none tracking-wide text-white sm:text-4xl">
            European Football News
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="home-news__badge">
            <span className="home-hero-live-dot" aria-hidden="true" />
            {articles.length} stories
          </span>
          <span className="home-news__badge home-news__badge--muted">
            Auto-updates · 2 min
            {polledAt || fetchedAt
              ? ` · ${new Date(polledAt ?? fetchedAt!).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : ""}
          </span>
        </div>
      </div>

      <div className="home-news__hero overflow-hidden rounded-2xl border border-white/10 bg-[#0c0814]/90 shadow-[0_24px_64px_rgba(0,0,0,0.35)]">
        <div className="grid lg:grid-cols-5">
          <div className="lg:col-span-3">
            <FeaturedHero article={hero} />
          </div>
          <div className="home-news__sidebar flex flex-col justify-center gap-6 border-t border-white/10 p-5 sm:p-6 lg:col-span-2 lg:border-l lg:border-t-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
              Latest headlines
            </p>
            {secondary.map((article) => (
              <SecondaryStory key={article.id} article={article} />
            ))}
          </div>
        </div>
      </div>

      {features.length > 0 ? (
        <section className="mt-10 sm:mt-12">
          <div className="home-news__features-header mb-6 flex items-end justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <p className="home-section-header__eyebrow mb-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00ff87]/85">
                More coverage
              </p>
              <h3 className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-white sm:text-3xl">
                News &amp; Features
              </h3>
            </div>
            <Link href="/news" className="home-section-header__link group shrink-0">
              Browse all leagues
              <span aria-hidden className="transition group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {features.map((article) => (
              <FeatureCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
