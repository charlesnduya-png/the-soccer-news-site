"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (initialArticles.length > 0) {
      setArticles(initialArticles);
      setLoading(false);
    }
  }, [initialArticles]);

  const { error } = useLiveRefresh<NewsResponse>({
    url: `/api/news?limit=${limit}&topic=${topic}`,
    intervalMs: REFRESH_MS,
    onData: (data) => {
      if (data.articles?.length) {
        setArticles(data.articles);
        setSourceCount(data.sources?.length ?? 0);
      } else if (initialArticles.length === 0) {
        // keep empty
      }
      setFetchedAt(data.fetchedAt ?? null);
      setDegraded(Boolean(data.degraded));
      setIsFallback(Boolean(data.isFallback));
      setLoading(false);
    },
  });

  if (loading && articles.length === 0) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: Math.min(limit, 6) }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse overflow-hidden rounded-2xl border border-white/10 bg-[#1a0533]/50"
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
          {error} — showing cached or RSS fallback where available.
        </p>
      )}
      {!error && degraded && (
        <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {isFallback
            ? "Live sources are temporarily unavailable — showing backup stories."
            : "Some news sources are temporarily unavailable — showing the latest verified stories."}
        </p>
      )}
      {!loading && articles.length > 0 && (
        <p className="mb-4 text-sm text-white/40">
          {articles.length} stories
          {articles.some((a) => a.videoUrl)
            ? ` · ${articles.filter((a) => a.videoUrl).length} with video`
            : ""}{" "}
          from {sourceCount || "multiple"} sources · auto-updates every 2 min
          {fetchedAt
            ? ` · refreshed ${new Date(fetchedAt).toLocaleTimeString([], {
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
