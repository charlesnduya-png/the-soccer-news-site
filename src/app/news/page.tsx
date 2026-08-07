import type { Metadata } from "next";
import { Suspense } from "react";
import { LeagueNewsPicker } from "@/components/league-news-picker";
import { NewsJsonLd } from "@/components/json-ld";
import { NewsFeed } from "@/components/news-feed";
import { NewsSourceBadge } from "@/components/news-source-badge";
import { PageHero } from "@/components/page-hero";
import { getNewsTopicFromParam, newsTopicLabel } from "@/lib/league-news-config";
import { newsTopicMetadata } from "@/lib/seo";

export const revalidate = 300;

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
        <NewsFeed limit={24} topic={topic} loadingLabel={`Loading ${label} news…`} />
        <p className="mt-8 text-center text-xs text-white/30">
          JSON feed available at{" "}
          <a
            href={`/api/news?limit=24&topic=${topic}`}
            className="text-[#00ff87] hover:underline"
          >
            /api/news?topic={topic}
          </a>
        </p>
      </div>
    </>
  );
}
