import type { Metadata } from "next";
import { KenyaFootballNav } from "@/components/kenya-football-nav";
import { MatchList } from "@/components/match-card";
import { PageHero } from "@/components/page-hero";
import { getKenyanResults } from "@/lib/kenya-football-api";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "KPL Results Today — Kenyan Premier League Scores",
  description:
    "Latest Kenyan Premier League results and full-time scores. Every KPL match result updated for fans following local football in Kenya.",
  path: "/kenya-football/results",
  keywords: [
    "KPL results today",
    "Kenyan Premier League results",
    "Kenya football scores",
    "Gor Mahia results",
  ],
});

export const revalidate = 900;

export default async function KenyanResultsPage() {
  const results = await getKenyanResults();

  return (
    <>
      <KenyaFootballNav />
      <PageHero
        title="Kenyan Results"
        subtitle="Latest SportPesa Premier League full-time scores and match results."
        badge="Kenya · Scores"
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <MatchList
          matches={results}
          competition="Kenyan Premier League"
          emptyMessage="No Kenyan Premier League results are available yet."
        />
        <p className="mt-8 text-center text-xs text-white/30">
          Results update automatically from TheSportsDB.
        </p>
      </div>
    </>
  );
}
