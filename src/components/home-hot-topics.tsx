import Link from "next/link";
import { LEAGUE_NEWS_CONFIG } from "@/lib/league-news-config";

const HOT_TOPICS = [
  { href: "/news", label: "All Europe" },
  { href: "/news?topic=premier-league", label: "🇬🇧 Premier League" },
  { href: "/news?topic=la-liga", label: "🇪🇸 La Liga" },
  { href: "/news?topic=bundesliga", label: "🇩🇪 Bundesliga" },
  { href: "/news?topic=serie-a", label: "🇮🇹 Serie A" },
  { href: "/news?topic=ligue-1", label: "🇫🇷 Ligue 1" },
  { href: "/transfers", label: "Transfers" },
  { href: "/kenya-football", label: "🇰🇪 Kenya" },
  ...LEAGUE_NEWS_CONFIG.slice(5).map((league) => ({
    href: `/news?topic=${league.slug}`,
    label: `${league.flag} ${league.name}`,
  })),
];

/** Homepage league / topic chips — same hot-topic strip style as before. */
export function HomeHotTopics() {
  return (
    <section className="home-hot-topics mb-8" aria-label="Hot topics">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="home-section-header__eyebrow mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00ff87]/85">
            Hot topics
          </p>
          <h2 className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-white sm:text-3xl">
            Jump into a league
          </h2>
        </div>
        <Link
          href="/news"
          className="home-section-header__link shrink-0 text-sm font-semibold text-[#00ff87]"
        >
          All news →
        </Link>
      </div>

      <nav
        aria-label="Hot football topics"
        className="home-hot-topics__scroller -mx-1 overflow-x-auto pb-1"
      >
        <div className="flex min-w-max gap-2 px-1">
          {HOT_TOPICS.map((topic) => (
            <Link
              key={topic.href + topic.label}
              href={topic.href}
              className="home-hot-topics__chip whitespace-nowrap rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-sm font-semibold text-white/80 transition hover:border-[#00ff87]/40 hover:bg-[#00ff87]/10 hover:text-[#00ff87]"
            >
              {topic.label}
            </Link>
          ))}
        </div>
      </nav>
    </section>
  );
}
