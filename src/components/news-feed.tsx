"use client";

import { useEffect, useRef, useState } from "react";
import type { NewsArticle } from "@/lib/types";
import type { NewsTopic } from "@/lib/news-api";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import { NewsGrid } from "./news-card";

interface NewsFeedProps {
  limit?: number;
  topic?: NewsTopic;
  initialArticles?: NewsArticle[];
  loadingLabel?: string;
}

type NewsResponse = {
  articles: NewsArticle[];
  sources?: string[];
  fetchedAt?: string;
  degraded?: boolean;
  isFallback?: boolean;
};

const REFRESH_MS = 2 * 60 * 1000;

export function NewsFeed({
  limit = 24,
  topic = "all",
  initialArticles = [],
  loadingLabel = "Loading latest football news…",
}: NewsFeedProps) {
  const [articles, setArticles] = useState<NewsArticle[]>(initialArticles);
  const [loading, setLoading] = useState(initialArticles.length === 0);
  const [sourceCount, setSourceCount] = useState(0);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const seededFromServer = useRef(initialArticles.length > 0);

  useEffect(() => {
    if (seededFromServer.current) return;
    if (initialArticles.length === 0) return;
    seededFromServer.current = true;
    setArticles(initialArticles);
    setLoading(false);
  }, [initialArticles]);

  const { error, updatedAt: polledAt } = useLiveRefresh<NewsResponse>({
    url: `/api/news?limit=${limit}&topic=${topic}`,
    intervalMs: REFRESH_MS,
    immediate: initialArticles.length === 0,
    onData: (data) => {
      setFetchedAt(data.fetchedAt ?? new Date().toISOString());
      setLoading(false);

      if (!data.articles?.length) {
        setDegraded(Boolean(data.degraded));
        setIsFallback(Boolean(data.isFallback));
        return;
      }

      setArticles((current) => {
        const keepCurrent =
          Boolean(data.isFallback) &&
          current.length > 0 &&
          data.articles.length < Math.min(3, current.length);
        if (keepCurrent) return current;

        const previousById = new Map(
          current
            .filter((article) => article.image)
            .map((article) => [article.id, article.image as string])
        );
        const next = data.articles.map((article) => {
          if (article.image) return article;
          const image = previousById.get(article.id);
          return image ? { ...article, image } : article;
        });

        const nextImaged = next.filter((article) => article.image).length;
        const currentImaged = current.filter((article) => article.image).length;
        if (current.length > 0 && currentImaged >= 3 && nextImaged === 0) {
          return current;
        }

        setSourceCount(data.sources?.length ?? 0);
        setDegraded(Boolean(data.degraded) && next.length === 0);
        setIsFallback(Boolean(data.isFallback) && next.length === 0);
        return next;
      });
    },
  });

  if (loading && articles.length === 0) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: Math.min(limit, 6) }).map((_, i) => (
          <div
            key={i}
            className="news-card news-card--skeleton animate-pulse overflow-hidden rounded-2xl border"
          >
            <div className="aspect-[16/9] bg-white/5" />
            <div className="space-y-3 p-5">
              <div className="h-3 w-24 rounded bg-white/10" />
              <div className="h-5 w-full rounded bg-white/10" />
              <div className="h-4 w-4/5 rounded bg-white/5" />
            </div>
          </div>
        ))}
        <p className="col-span-full text-center text-sm text-white/40">{loadingLabel}</p>
      </div>
    );
  }

  return (
    <>
      {error && (
        <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {error.includes("522")
            ? "Host timed out (HTTP 522) — your Node app is slow or unreachable behind Cloudflare. News shows cached/RSS fallback; advert images at /banners should still load if public/ was deployed."
            : `${error} — showing cached or RSS fallback where available.`}
        </p>
      )}
      {!error && isFallback && (
        <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Live sources are temporarily unavailable — showing backup stories.
        </p>
      )}
      {!loading && articles.length > 0 && (
        <p className="news-feed__meta mb-4 text-sm">
          {articles.length} stories
          {articles.some((a) => a.videoUrl)
            ? ` · ${articles.filter((a) => a.videoUrl).length} with video`
            : ""}{" "}
          from {sourceCount || "multiple"} sources · auto-updates every 2 min
          {polledAt || fetchedAt
            ? ` · refreshed ${new Date(polledAt ?? fetchedAt!).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : ""}
        </p>
      )}
      <NewsGrid articles={articles} />
    </>
  );
}
