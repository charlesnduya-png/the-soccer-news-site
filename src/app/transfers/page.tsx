import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { TransfersFeed } from "@/components/transfers-feed";
import { getNews } from "@/lib/news-api";
import { PAGE_SEO } from "@/lib/seo";

export const metadata: Metadata = PAGE_SEO.transfers;
export const revalidate = 120;

export default async function TransfersPage() {
  const transfers = await getNews(20, "transfers");

  return (
    <>
      <PageHero
        title="Premier League Transfers"
        subtitle="Signings, loans and transfer rumours only — auto-updated from BBC Transfers, Sky, Guardian, ESPN and Google News."
        badge="Transfers"
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <TransfersFeed limit={20} initialArticles={transfers} />
      </div>
    </>
  );
}
