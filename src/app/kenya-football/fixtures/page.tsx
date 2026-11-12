import type { Metadata } from "next";
import { KenyaFootballNav } from "@/components/kenya-football-nav";
import { MatchBoard } from "@/components/match-board";
import { PageHero } from "@/components/page-hero";
import { getKenyanMatchBoard } from "@/lib/kenya-football-api";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "KPL Fixtures Today — Kenyan Premier League Schedule",
  description:
    "Upcoming Kenyan Premier League fixtures with dates and kick-off times. KPL match schedule for Gor Mahia, AFC Leopards and every local club.",
  path: "/kenya-football/fixtures",
  keywords: [
    "KPL fixtures today",
    "Kenyan Premier League fixtures",
    "Kenya football matches",
    "Gor Mahia fixtures",
  ],
});

export const revalidate = 900;

export default async function KenyanFixturesPage() {
  const { live, recent, upcoming } = await getKenyanMatchBoard();

  return (
    <>
      <KenyaFootballNav />
      <PageHero
        title="Kenyan Fixtures"
        subtitle="Upcoming Kenyan Premier League and Kenyan club matches, plus recent full-time scores."
        badge="Kenya · Schedule"
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <MatchBoard
          live={live}
          recent={recent}
          upcoming={upcoming}
          competition="Kenyan Football"
          emptyMessage="No upcoming KPL fixtures right now. Recent Kenyan Premier League results are shown when the new season schedule is not yet published."
        />
        <p className="mt-8 text-center text-xs text-white/30">
          Showing Kenyan Premier League matches only (CAF and friendlies excluded).
        </p>
      </div>
    </>
  );
}
