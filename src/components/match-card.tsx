import Image from "next/image";
import type { Match } from "@/lib/types";
import { formatMatchDate, getMatchStatusLabel, isLiveMatch } from "@/lib/utils";

interface MatchCardProps {
  match: Match;
  competition?: string;
  compact?: boolean;
}

export function MatchCard({
  match,
  competition = "Premier League",
  compact = false,
}: MatchCardProps) {
  const competitionLabel = match.competition ?? competition;
  const live = isLiveMatch(match.status);
  const finished = match.status === "FINISHED";
  const homeScore = match.score.fullTime.home;
  const awayScore = match.score.fullTime.away;

  return (
    <div
      className={`home-match-card rounded-xl border border-white/10 bg-[#1a0533]/80 transition hover:border-[#00ff87]/30 hover:bg-[#1a0533] ${
        compact ? "p-3.5" : "p-4"
      }`}
    >
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="text-white/50">
          {match.matchday
            ? `${competitionLabel} · Matchday ${match.matchday}`
            : competitionLabel}
        </span>
        {live ? (
          <span className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-2 py-0.5 font-bold text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
            LIVE
          </span>
        ) : (
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${
              finished ? "bg-white/10 text-white/60" : "text-[#00ff87]"
            }`}
          >
            {finished ? "FT" : formatMatchDate(match.utcDate)}
          </span>
        )}
      </div>

      <div className="space-y-3">
        <TeamRow
          team={match.homeTeam}
          score={homeScore}
          showScore={finished || live}
          highlight={match.score.winner === "HOME_TEAM"}
        />
        <TeamRow
          team={match.awayTeam}
          score={awayScore}
          showScore={finished || live}
          highlight={match.score.winner === "AWAY_TEAM"}
        />
      </div>

      {!finished && !live && (
        <p className="mt-3 text-center text-xs text-white/40">
          {getMatchStatusLabel(match.status)}
        </p>
      )}
    </div>
  );
}

function TeamRow({
  team,
  score,
  showScore,
  highlight,
}: {
  team: Match["homeTeam"];
  score: number | null;
  showScore: boolean;
  highlight: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Image
          src={team.crest}
          alt={team.name}
          width={28}
          height={28}
          className="h-7 w-7 shrink-0 object-contain"
        />
        <span
          className={`truncate font-medium ${highlight ? "text-white" : "text-white/80"}`}
        >
          {team.shortName}
        </span>
      </div>
      {showScore && (
        <span
          className={`text-xl font-black tabular-nums ${
            highlight ? "text-[#00ff87]" : "text-white"
          }`}
        >
          {score ?? "-"}
        </span>
      )}
    </div>
  );
}

interface MatchListProps {
  matches: Match[];
  emptyMessage?: string;
  competition?: string;
  layout?: "grid" | "stack";
}

export function MatchList({
  matches,
  emptyMessage = "No matches found",
  competition = "Premier League",
  layout = "grid",
}: MatchListProps) {
  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#1a0533]/50 px-6 py-12 text-center text-white/50">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={
        layout === "stack"
          ? "flex flex-col gap-3"
          : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      }
    >
      {matches.map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          competition={competition}
          compact={layout === "stack"}
        />
      ))}
    </div>
  );
}
