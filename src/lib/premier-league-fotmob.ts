import type { CompetitionInfo, Match, StandingRow, Team } from "@/lib/types";

const FOTMOB_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
};

const PREMIER_LEAGUE_ID = 47;

type FotMobTeam = {
  id: string | number;
  name: string;
  shortName?: string;
};

type FotMobMatch = {
  id: string | number;
  round?: string | number;
  roundName?: number;
  home: FotMobTeam;
  away: FotMobTeam;
  status: {
    utcTime: string;
    started?: boolean;
    finished?: boolean;
    cancelled?: boolean;
    scoreStr?: string;
    reason?: { short?: string };
  };
};

type FotMobTableRow = {
  id: number | string;
  name: string;
  shortName?: string;
  idx: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  scoresStr?: string;
  goalConDiff: number;
  pts: number;
};

type FotMobFormMatch = {
  resultString?: string;
};

type FotMobLeaguePayload = {
  details?: {
    name?: string;
    selectedSeason?: string;
    latestSeason?: string;
  };
  allAvailableSeasons?: string[];
  fixtures?: { allMatches?: FotMobMatch[] };
  table?: Array<{
    data?: { table?: { all?: FotMobTableRow[] } };
    teamForm?: Record<string, FotMobFormMatch[]>;
  }>;
};

function teamCrest(id: string | number): string {
  return `https://images.fotmob.com/image_resources/logo/teamlogo/${id}.png`;
}

function toTeam(team: FotMobTeam): Team {
  const name = team.name || "Unknown";
  return {
    id: Number(team.id) || Math.abs(hashCode(name)),
    name,
    shortName: team.shortName || name,
    tla: initials(name),
    crest: teamCrest(team.id),
  };
}

function initials(name: string): string {
  return name
    .replace(/[^a-zA-Z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 3);
}

function hashCode(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function parseScoreStr(scoreStr?: string): { home: number | null; away: number | null } {
  if (!scoreStr) return { home: null, away: null };
  const match = scoreStr.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (!match) return { home: null, away: null };
  return { home: Number(match[1]), away: Number(match[2]) };
}

function mapStatus(match: FotMobMatch): string {
  if (match.status.cancelled) return "CANCELLED";
  if (match.status.finished) return "FINISHED";
  if (match.status.started) return "IN_PLAY";
  return "SCHEDULED";
}

function toMatch(match: FotMobMatch): Match {
  const { home, away } = parseScoreStr(match.status.scoreStr);
  const status = mapStatus(match);

  return {
    id: Number(match.id),
    utcDate: match.status.utcTime,
    status,
    matchday: match.roundName ?? (match.round ? Number(match.round) : null),
    stage: "REGULAR_SEASON",
    competition: "Premier League",
    homeTeam: toTeam(match.home),
    awayTeam: toTeam(match.away),
    score: {
      winner:
        home === null || away === null
          ? null
          : home > away
            ? "HOME_TEAM"
            : away > home
              ? "AWAY_TEAM"
              : "DRAW",
      fullTime: { home, away },
      halfTime: { home: null, away: null },
    },
  };
}

const leagueInflight = new Map<string, Promise<FotMobLeaguePayload | null>>();

async function fetchLeague(season?: string): Promise<FotMobLeaguePayload | null> {
  const key = season || "current";
  const existing = leagueInflight.get(key);
  if (existing) return existing;

  const params = new URLSearchParams({ id: String(PREMIER_LEAGUE_ID) });
  if (season) params.set("season", season);

  const request = (async () => {
    try {
      const response = await fetch(
        `https://www.fotmob.com/api/data/leagues?${params.toString()}`,
        {
          headers: FOTMOB_HEADERS,
          next: { revalidate: season ? 1800 : 300 },
          signal: AbortSignal.timeout(8_000),
        }
      );
      if (!response.ok) return null;
      return (await response.json()) as FotMobLeaguePayload;
    } catch (error) {
      console.error("FotMob Premier League fetch failed:", error);
      return null;
    } finally {
      leagueInflight.delete(key);
    }
  })();

  leagueInflight.set(key, request);
  return request;
}

function matchesFromPayload(payload: FotMobLeaguePayload | null): Match[] {
  return (payload?.fixtures?.allMatches ?? []).map(toMatch);
}

function parseScoresStr(scoresStr?: string): { goalsFor: number; goalsAgainst: number } {
  if (!scoresStr) return { goalsFor: 0, goalsAgainst: 0 };
  const match = scoresStr.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (!match) return { goalsFor: 0, goalsAgainst: 0 };
  return { goalsFor: Number(match[1]), goalsAgainst: Number(match[2]) };
}

function formFromTeam(
  teamId: string | number,
  teamForm?: Record<string, FotMobFormMatch[]>
): string | null {
  const entries = teamForm?.[String(teamId)];
  if (!entries?.length) return null;
  return entries
    .map((entry) => entry.resultString)
    .filter(Boolean)
    .join(",");
}

function seasonStartEnd(selectedSeason?: string): { startDate: string; endDate: string } {
  const year = Number(selectedSeason?.split("/")[0]);
  if (!Number.isFinite(year)) {
    return { startDate: "2026-08-14", endDate: "2027-05-23" };
  }
  return {
    startDate: `${year}-08-14`,
    endDate: `${year + 1}-05-23`,
  };
}

function standingsFromPayload(payload: FotMobLeaguePayload | null): StandingRow[] {
  const block = payload?.table?.[0];
  const rows = block?.data?.table?.all ?? [];
  return rows.map((row) => {
    const { goalsFor, goalsAgainst } = parseScoresStr(row.scoresStr);
    return {
      position: row.idx,
      team: toTeam({ id: row.id, name: row.name, shortName: row.shortName }),
      playedGames: row.played,
      won: row.wins,
      draw: row.draws,
      lost: row.losses,
      goalsFor,
      goalsAgainst,
      goalDifference: row.goalConDiff,
      points: row.pts,
      form: formFromTeam(row.id, block?.teamForm),
    };
  });
}

/**
 * Live Premier League table from FotMob (no API key required).
 * Used when football-data.org is unavailable.
 */
export async function getPremierLeagueStandingsFromFotMob(): Promise<StandingRow[]> {
  const current = await fetchLeague();
  return standingsFromPayload(current);
}

/** Season metadata from FotMob when football-data.org is unavailable. */
export async function getPremierLeagueCompetitionFromFotMob(): Promise<CompetitionInfo | null> {
  const current = await fetchLeague();
  if (!current?.details?.selectedSeason) return null;

  const standings = standingsFromPayload(current);
  const currentMatchday = standings.reduce(
    (max, row) => Math.max(max, row.playedGames),
    0
  );
  const { startDate, endDate } = seasonStartEnd(current.details.selectedSeason);

  return {
    name: current.details.name || "Premier League",
    emblem: "https://crests.football-data.org/PL.png",
    currentSeason: {
      startDate,
      endDate,
      currentMatchday: currentMatchday || 1,
    },
  };
}

/**
 * Real Premier League fixtures/results from FotMob (no API key required).
 * Used when football-data.org is unavailable.
 */
export async function getPremierLeagueMatchesFromFotMob(
  status?: "SCHEDULED" | "FINISHED" | "LIVE"
): Promise<Match[]> {
  const current = await fetchLeague();
  if (!current) return [];

  const currentMatches = matchesFromPayload(current);
  const now = Date.now();

  if (status === "LIVE") {
    return currentMatches
      .filter((match) => ["IN_PLAY", "PAUSED", "LIVE"].includes(match.status))
      .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
  }

  if (status === "SCHEDULED") {
    return currentMatches
      .filter((match) => {
        if (["FINISHED", "CANCELLED"].includes(match.status)) return false;
        if (["IN_PLAY", "PAUSED", "LIVE"].includes(match.status)) return false;
        return new Date(match.utcDate).getTime() >= now - 6 * 60 * 60 * 1000;
      })
      .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
  }

  if (status === "FINISHED") {
    let finished = currentMatches.filter((match) => match.status === "FINISHED");

    // Early in a new season there may be no finished games yet — use prior season.
    if (finished.length === 0) {
      const seasons = current.allAvailableSeasons ?? [];
      const previous = seasons.find(
        (season) => season && season !== current.details?.selectedSeason
      );
      if (previous) {
        const previousPayload = await fetchLeague(previous);
        finished = matchesFromPayload(previousPayload).filter(
          (match) => match.status === "FINISHED"
        );
      }
    }

    return finished.sort(
      (a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime()
    );
  }

  return currentMatches.sort(
    (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
  );
}
