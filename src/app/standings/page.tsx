import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { StandingsTable } from "@/components/standings-table";
import { getCompetition, getStandings } from "@/lib/football-api";

import { PAGE_SEO } from "@/lib/seo";

export const metadata: Metadata = PAGE_SEO.standings;

export const revalidate = 120;

export default async function StandingsPage() {
  const [competition, standings] = await Promise.all([
    getCompetition(),
    getStandings(),
  ]);

  return (
    <>
      <PageHero
        title="League Table"
        subtitle={`${competition.name} standings — updated automatically every 2 minutes.`}
        badge="Standings"
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <StandingsTable standings={standings} />
      </div>
    </>
  );
}
