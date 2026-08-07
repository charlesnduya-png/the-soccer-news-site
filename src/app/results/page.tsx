import type { Metadata } from "next";
import { MatchList } from "@/components/match-card";
import { PageHero } from "@/components/page-hero";
import { getMatches } from "@/lib/football-api";

import { PAGE_SEO } from "@/lib/seo";

export const metadata: Metadata = PAGE_SEO.results;

export const revalidate = 600;

export default async function ResultsPage() {
  const results = await getMatches("FINISHED");
  const recent = [...results].reverse();

  return (
    <>
      <PageHero
        title="Results"
        subtitle="Full-time scores from every Premier League match this season."
        badge="Scores"
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <MatchList matches={recent} emptyMessage="No results available yet." />
      </div>
    </>
  );
}
