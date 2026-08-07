"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  getNewsTopicFromParam,
  LEAGUE_NEWS_CONFIG,
  type NewsTopic,
} from "@/lib/league-news-config";

const SPECIAL_TOPICS: Array<{ slug: NewsTopic; label: string }> = [
  { slug: "european-leagues", label: "All Europe" },
  { slug: "kenyan-football", label: "🇰🇪 Kenya" },
  { slug: "transfers", label: "Transfers" },
  { slug: "all", label: "Everything" },
];

export function LeagueNewsPicker({ active }: { active: NewsTopic }) {
  const searchParams = useSearchParams();
  const current = getNewsTopicFromParam(searchParams.get("topic") ?? active);

  function hrefFor(topic: NewsTopic) {
    const params = new URLSearchParams(searchParams.toString());
    if (topic === "european-leagues") {
      params.delete("topic");
    } else {
      params.set("topic", topic);
    }
    const query = params.toString();
    return query ? `/news?${query}` : "/news";
  }

  return (
    <nav
      aria-label="Filter news by league"
      className="mb-8 -mx-1 overflow-x-auto pb-1"
    >
      <div className="flex min-w-max gap-2 px-1">
        {SPECIAL_TOPICS.map((item) => {
          const selected =
            current === item.slug ||
            (item.slug === "european-leagues" && !searchParams.get("topic"));
          return (
            <Link
              key={item.slug}
              href={hrefFor(item.slug)}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                selected
                  ? "border-[#00ff87]/50 bg-[#00ff87]/15 text-[#00ff87]"
                  : "border-white/15 bg-white/[0.04] text-white/75 hover:border-[#00ff87]/30 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        {LEAGUE_NEWS_CONFIG.map((league) => {
          const selected = current === league.slug;
          return (
            <Link
              key={league.slug}
              href={hrefFor(league.slug)}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition ${
                selected
                  ? "border-[#00ff87]/50 bg-[#00ff87]/15 text-[#00ff87]"
                  : "border-white/15 bg-white/[0.04] text-white/75 hover:border-[#00ff87]/30 hover:text-white"
              }`}
            >
              {league.flag} {league.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
