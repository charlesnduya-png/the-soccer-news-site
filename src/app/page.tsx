import type { Metadata } from "next";
import Link from "next/link";
import { HomeHeroHeadline } from "@/components/home-hero-headline";
import { HomeJsonLd } from "@/components/json-ld";
import { HomeNews } from "@/components/home-news";
import { HomeQuickNav } from "@/components/home-quick-nav";
import { JantaAdvert } from "@/components/janta-advert";
import { MatchList } from "@/components/match-card";
import { NewsFeed } from "@/components/news-feed";
import { SectionHeader } from "@/components/section-header";
import { StandingsTable } from "@/components/standings-table";
import { getMatchBoard, getStandings } from "@/lib/football-api";
import { getNews } from "@/lib/news-api";
import { PAGE_SEO } from "@/lib/seo";

export const metadata: Metadata = PAGE_SEO.home;
export const revalidate = 120;

const quickLinks = [
  { href: "/fixtures", label: "Matches" },
  { href: "/standings", label: "Table" },
  { href: "/scorers", label: "Statistics" },
  { href: "/news", label: "News" },
  { href: "/kenya-football", label: "Kenya" },
  { href: "/transfers", label: "Transfers" },
  { href: "/teams", label: "Clubs" },
];

const kenyaLinks = [
  {
    href: "/kenya-football/teams",
    label: "Teams",
    description: "Premier League clubs & squads",
    stat: "18 clubs",
  },
  {
    href: "/kenya-football/fixtures",
    label: "Fixtures",
    description: "Upcoming Kenyan match schedule",
    stat: "This week",
  },
  {
    href: "/kenya-football/results",
    label: "Results",
    description: "Latest scores from the KPL",
    stat: "Live feed",
  },
];

export default async function HomePage() {
  const [standings, matchBoard, europeNews, kenyaNews] = await Promise.all([
    getStandings(),
    getMatchBoard(),
    getNews(12, "european-leagues"),
    getNews(8, "kenyan-football"),
  ]);

  const featuredMatches = [
    ...matchBoard.live,
    ...matchBoard.recent.slice(0, 2),
    ...matchBoard.upcoming.slice(0, 2),
  ].slice(0, 4);
  const showMatches = featuredMatches.length > 0;
  const liveCount = matchBoard.live.length;

  return (
    <>
      <HomeJsonLd />

      <section className="home-masthead relative overflow-hidden border-b border-white/[0.08]">
        <div className="home-masthead__glow pointer-events-none absolute inset-0" />
        <div className="home-masthead__pitch pointer-events-none absolute inset-0" />
        <div className="home-masthead__beam pointer-events-none absolute inset-0" />

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
          <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12">
            <div className="min-w-0">
              <HomeHeroHeadline />
              <HomeQuickNav links={quickLinks} />
            </div>

            <div className="home-fade-up home-fade-up--3 flex w-full min-w-0 justify-center lg:justify-end">
              <JantaAdvert />
            </div>
          </div>
        </div>
      </section>

      <main className="home-main mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <HomeNews initialArticles={europeNews} limit={12} />

        <section className="home-section home-section--kenya mt-14 sm:mt-16 lg:mt-20">
          <SectionHeader
            title="Kenyan Football"
            eyebrow="Local coverage"
            href="/kenya-football"
            linkLabel="All Kenya news"
          />

          <nav
            aria-label="Explore Kenyan football"
            className="home-kenya-grid mb-8 grid gap-3 sm:grid-cols-3"
          >
            {kenyaLinks.map((link) => (
              <Link key={link.href} href={link.href} className="home-kenya-card group">
                <span className="home-kenya-card__stat">{link.stat}</span>
                <span className="home-kenya-card__title">{link.label}</span>
                <span className="home-kenya-card__desc">{link.description}</span>
                <span className="home-kenya-card__arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </nav>

          <div className="home-section__body">
            <NewsFeed
              limit={8}
              topic="kenyan-football"
              initialArticles={kenyaNews}
              loadingLabel="Loading Kenyan football news…"
            />
          </div>
        </section>

        <section className="home-bento mt-14 grid gap-6 sm:mt-16 lg:mt-20 lg:grid-cols-5 lg:gap-6">
          <div className="home-section home-section--table lg:col-span-3">
            <SectionHeader
              title="Premier League Table"
              eyebrow="Standings"
              href="/standings"
              linkLabel="Full table"
            />
            <div className="home-section__body">
              <StandingsTable standings={standings} compact />
            </div>
          </div>

          {showMatches ? (
            <div className="home-section home-section--matches lg:col-span-2">
              <SectionHeader
                title="Match Centre"
                eyebrow={liveCount > 0 ? `${liveCount} live now` : "Fixtures & results"}
                href="/fixtures"
                linkLabel="All matches"
              />
              <div className="home-section__body">
                <MatchList matches={featuredMatches} layout="stack" />
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </>
  );
}
