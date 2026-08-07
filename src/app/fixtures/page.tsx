import type { Metadata } from "next";
import { MatchBoard } from "@/components/match-board";
import { PageHero } from "@/components/page-hero";
import { getMatchBoard } from "@/lib/football-api";

import { PAGE_SEO } from "@/lib/seo";

export const metadata: Metadata = PAGE_SEO.fixtures;

export const revalidate = 300;

export default async function FixturesPage() {
  const { live, recent, upcoming } = await getMatchBoard();

  return (
    <>
      <PageHero
        title="Fixtures"
        subtitle="Live games, recent full-time scores, and upcoming Premier League kick-offs."
        badge="Schedule"
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <MatchBoard
          live={live}
          recent={recent}
          upcoming={upcoming}
          emptyMessage="No Premier League matches available right now."
        />
      </div>
    </>
  );
}