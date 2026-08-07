import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { TeamGrid } from "@/components/team-grid";
import { getTeams } from "@/lib/football-api";

import { PAGE_SEO } from "@/lib/seo";

export const metadata: Metadata = PAGE_SEO.teams;

export const revalidate = 86400;

export default async function TeamsPage() {
  const teams = await getTeams();

  return (
    <>
      <PageHero
        title="Teams"
        subtitle="All Premier League clubs — crests, names and home venues."
        badge="Clubs"
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <TeamGrid teams={teams} />
      </div>
    </>
  );
}
