import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { ScorersTable } from "@/components/scorers-table";
import { getScorers } from "@/lib/football-api";

import { PAGE_SEO } from "@/lib/seo";

export const metadata: Metadata = PAGE_SEO.scorers;

export const revalidate = 3600;

export default async function ScorersPage() {
  const scorers = await getScorers();

  return (
    <>
      <PageHero
        title="Top Scorers"
        subtitle="The race for the Golden Boot — updated from live API data."
        badge="Stats"
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ScorersTable scorers={scorers} />
      </div>
    </>
  );
}
