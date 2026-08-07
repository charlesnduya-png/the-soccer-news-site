import type { Metadata } from "next";
import { KenyaFootballNav } from "@/components/kenya-football-nav";
import { PageHero } from "@/components/page-hero";
import { NewsFeed } from "@/components/news-feed";
import { NewsSourceBadge } from "@/components/news-source-badge";
import { getNews } from "@/lib/news-api";
import { PAGE_SEO } from "@/lib/seo";

export const metadata: Metadata = PAGE_SEO.kenyaFootball;
export const revalidate = 120;

export default async function KenyaFootballPage() {
  const articles = await getNews(24, "kenyan-football");

  return (
    <>
      <KenyaFootballNav />
      <PageHero
        title="Kenyan Football News"
        subtitle="Harambee Stars, KPL, FKF and local football headlines from Standard Sports and GNews Kenya — updated automatically."
        badge="Kenya"
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <NewsSourceBadge topic="kenyan-football" />
        <NewsFeed
          limit={24}
          topic="kenyan-football"
          initialArticles={articles}
          loadingLabel="Loading Kenyan football news…"
        />
        <p className="mt-8 text-center text-xs text-white/30">
          JSON feed available at{" "}
          <a
            href="/api/news?topic=kenyan-football&limit=24"
            className="text-[#00ff87] hover:underline"
          >
            /api/news?topic=kenyan-football
          </a>
        </p>
      </div>
    </>
  );
}
