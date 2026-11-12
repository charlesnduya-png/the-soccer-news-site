import type { Metadata } from "next";
import { Suspense } from "react";
import { LeagueNewsPicker } from "@/components/league-news-picker";
import { NewsJsonLd } from "@/components/json-ld";
import { NewsFeed } from "@/components/news-feed";
import { NewsSourceBadge } from "@/components/news-source-badge";
import { PageHero } from "@/components/page-hero";
import { getNewsTopicFromParam, newsTopicLabel } from "@/lib/league-news-config";
import { getNews } from "@/lib/news-api";
import { newsTopicMetadata } from "@/lib/seo";

export const revalidate = 120;

type NewsPageProps = {
  searchParams: Promise<{ topic?: string }>;
};

export async function generateMetadata({
  searchParams,
}: NewsPageProps): Promise<Metadata> {
  const { topic: topicParam } = await searchParams;
  const topic = getNewsTopicFromParam(topicParam);
  return newsTopicMetadata(topic);
}

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const { topic: topicParam } = await searchParams;
  const topic = getNewsTopicFromParam(topicParam);
  const label = newsTopicLabel(topic);
  const articles = await getNews(24, topic);

  return (
    <>
      <NewsJsonLd />
      <PageHero
        title={`${label} News`}
        subtitle="Premier League, La Liga, Bundesliga, Serie A, Ligue 1 and 10 more European leagues — plus Kenyan football — updated automatically."
        badge="News"
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Suspense fallback={null}>
          <LeagueNewsPicker active={topic} />
        </Suspense>
        <NewsSourceBadge topic={topic} />
        <NewsFeed
          limit={24}
          topic={topic}
          initialArticles={articles}
          loadingLabel={`Loading ${label} news…`}
        />
      </div>
    </>
  );
}
