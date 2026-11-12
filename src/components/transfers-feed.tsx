"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import { NewsArticleImage } from "@/components/news-article-image";
import type { NewsArticle } from "@/lib/types";
import { videoPosterUrl } from "@/lib/news-video";
import { formatNewsDate } from "@/lib/utils";

const REFRESH_MS = 2 * 60 * 1000;

interface TransfersFeedProps {
  limit?: number;
  initialArticles?: NewsArticle[];
}

export function TransfersFeed({
  limit = 10,
  initialArticles = [],
}: TransfersFeedProps) {
  const [articles, setArticles] = useState<NewsArticle[]>(initialArticles);
  const [loading, setLoading] = useState(initialArticles.length === 0);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (initialArticles.length > 0) {
      setArticles(initialArticles);
      setLoading(false);
    }
  }, [initialArticles]);

  useLiveRefresh<{ articles: NewsArticle[]; fetchedAt?: string }>({
    url: `/api/news?topic=transfers&limit=${limit}`,
    intervalMs: REFRESH_MS,
    onData: (data) => {
      if (data.articles?.length) {
        setArticles(data.articles);
        setUpdatedAt(data.fetchedAt ?? new Date().toISOString());
      }
      setLoading(false);
    },
  });

  if (loading && articles.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-white/10 bg-[#1a0533]/60"
          />
        ))}
        <p className="text-center text-sm text-white/40">
          Loading live Premier League transfers…
        </p>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-[#1a0533]/50 px-6 py-10 text-center text-white/50">
        No transfer stories right now — checking again shortly.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs">
        <span className="inline-flex items-center gap-2 rounded-full bg-red-500/20 px-3 py-1 font-bold uppercase tracking-wider text-red-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
          Live transfers
        </span>
        <span className="text-white/40">
          Auto-updates every 2 minutes
          {updatedAt ? ` · last ${formatNewsDate(updatedAt)}` : ""}
        </span>
      </div>

      <ul className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-[#1a0533]/70">
        {articles.map((article) => (
          <li key={article.id}>
            <Link
              href={`/news/${article.id}`}
              className="group flex gap-4 px-4 py-4 transition hover:bg-white/5 sm:px-5"
            >
              <NewsArticleImage
                src={
                  videoPosterUrl(article.videoUrl, article.image) ?? article.image
                }
                articleLink={article.link}
                articleId={article.id}
                className="hidden h-16 w-24 shrink-0 rounded-lg object-cover sm:block"
              />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-[#00ff87]/15 px-2 py-0.5 font-semibold text-[#00ff87]">
                    {article.source}
                  </span>
                  {article.videoUrl ? (
                    <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 font-semibold uppercase tracking-wide text-white/80">
                      Video
                    </span>
                  ) : null}
                  <span className="text-white/40">{formatNewsDate(article.pubDate)}</span>
                </div>
                <h3 className="font-bold text-white transition group-hover:text-[#00ff87] sm:text-lg">
                  {article.title}
                </h3>
                {article.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-white/50">
                    {article.description}
                  </p>
                ) : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
