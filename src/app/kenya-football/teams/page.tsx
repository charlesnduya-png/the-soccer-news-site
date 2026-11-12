import type { Metadata } from "next";
import { KenyaFootballNav } from "@/components/kenya-football-nav";
import { PageHero } from "@/components/page-hero";
import { TeamGrid } from "@/components/team-grid";
import { getKenyanTeams } from "@/lib/kenya-football-api";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "KPL Teams — All Kenyan Premier League Clubs",
  description:
    "All 18 Kenyan Premier League clubs — Gor Mahia, AFC Leopards, Tusker, Kenya Police and more. Crests, squads and team info in one place.",
  path: "/kenya-football/teams",
  keywords: [
    "KPL teams",
    "Kenyan football clubs",
    "Gor Mahia team",
    "SportPesa Premier League teams",
  ],
});

export const revalidate = 86_400;

export default async function KenyanTeamsPage() {
  const teams = await getKenyanTeams();

  return (
    <>
      <KenyaFootballNav />
      <PageHero
        title="Kenyan Teams"
        subtitle="All 18 SportPesa Premier League clubs, their badges and home grounds."
        badge="Kenya · Clubs"
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <TeamGrid teams={teams} />
        <p className="news-feed__meta mt-8 text-center text-xs">
          Club details update automatically from TheSportsDB and the official league list.
        </p>
      </div>
    </>
  );
}
