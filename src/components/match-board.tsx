import type { Match } from "@/lib/types";
import { MatchList } from "./match-card";

interface MatchBoardProps {
  live?: Match[];
  recent?: Match[];
  upcoming?: Match[];
  competition?: string;
  emptyMessage?: string;
}

export function MatchBoard({
  live = [],
  recent = [],
  upcoming = [],
  competition = "Premier League",
  emptyMessage = "No matches found.",
}: MatchBoardProps) {
  const hasContent = live.length > 0 || recent.length > 0 || upcoming.length > 0;

  if (!hasContent) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#1a0533]/50 px-6 py-12 text-center text-white/50">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {live.length > 0 ? (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-red-400">
            Live now
          </h2>
          <MatchList matches={live} competition={competition} />
        </section>
      ) : null}

      {recent.length > 0 ? (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-white/50">
            Recent results
          </h2>
          <MatchList matches={recent} competition={competition} />
        </section>
      ) : null}

      {upcoming.length > 0 ? (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#00ff87]/80">
            Upcoming fixtures
          </h2>
          <MatchList matches={upcoming} competition={competition} />
        </section>
      ) : null}
    </div>
  );
}
