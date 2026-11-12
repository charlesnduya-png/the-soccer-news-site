import {
  fallbackCompetition,
  fallbackFixtures,
  fallbackResults,
  fallbackScorers,
  fallbackStandings,
} from "./fallback-data";
import {
  getPremierLeagueCompetitionFromFotMob,
  getPremierLeagueMatchesFromFotMob,
  getPremierLeagueStandingsFromFotMob,
} from "./premier-league-fotmob";
import type {
  CompetitionInfo,
  Match,
  Scorer,
  StandingRow,
  Team,
} from "./types";

const BASE_URL = "https://api.football-data.org/v4";
const COMPETITION = "PL";

async function fetchFromApi<T>(path: string, revalidate = 300): Promise<T | null> {
  const token = process.env.FOOTBALL_DATA_API_KEY;

  if (!token) {
    return null;
  }

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { "X-Auth-Token": token },
      next: { revalidate },
    });

    if (!res.ok) {
      console.error(`Football API error: ${res.status} ${path}`);
      return null;
    }

    return res.json() as Promise<T>;
  } catch (error) {
    console.error("Football API fetch failed:", error);
    return null;
  }
}

export async function getCompetition(): Promise<CompetitionInfo> {
  const data = await fetchFromApi<{
    name: string;
    emblem: string;
    currentSeason: CompetitionInfo["currentSeason"];
  }>(`/competitions/${COMPETITION}`, 3600);

  if (data) return data;

  const fotmob = await getPremierLeagueCompetitionFromFotMob();
  return fotmob ?? fallbackCompetition;
}

export async function getStandings(): Promise<StandingRow[]> {
  const data = await fetchFromApi<{
    standings: Array<{ type: string; table: StandingRow[] }>;
  }>(`/competitions/${COMPETITION}/standings`, 120);

  const table = data?.standings?.find((s) => s.type === "TOTAL")?.table;
  if (table?.length) return table;

  const fotmob = await getPremierLeagueStandingsFromFotMob();
  return fotmob.length ? fotmob : fallbackStandings;
}

export async function getTeams(): Promise<Team[]> {
  const data = await fetchFromApi<{ teams: Team[] }>(
    `/competitions/${COMPETITION}/teams`,
    86400
  );

  if (data?.teams) {
    return data.teams.sort((a, b) => a.name.localeCompare(b.name));
  }

  const fotmob = await getPremierLeagueStandingsFromFotMob();
  if (fotmob.length) {
    return fotmob.map((row) => row.team).sort((a, b) => a.name.localeCompare(b.name));
  }

  return fallbackStandings.map((row) => row.team);
}

export async function getScorers(): Promise<Scorer[]> {
  const data = await fetchFromApi<{ scorers: Scorer[] }>(
    `/competitions/${COMPETITION}/scorers?limit=20`,
    3600
  );

  return data?.scorers ?? fallbackScorers;
}

export async function getMatches(status?: "SCHEDULED" | "FINISHED" | "LIVE"): Promise<Match[]> {
  const statusParam = status ? `?status=${status}` : "";
  const revalidate = status === "LIVE" ? 30 : status === "SCHEDULED" ? 300 : 600;

  const data = await fetchFromApi<{ matches: Match[] }>(
    `/competitions/${COMPETITION}/matches${statusParam}`,
    revalidate
  );

  if (data?.matches?.length) {
    return data.matches.sort(
      (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
    );
  }

  // Prefer real FotMob fixtures over invented placeholder matches.
  const fotmobMatches = await getPremierLeagueMatchesFromFotMob(status);
  if (fotmobMatches.length) {
    return fotmobMatches;
  }

  if (status === "FINISHED") return fallbackResults;
  if (status === "SCHEDULED") return fallbackFixtures;
  if (status === "LIVE") return [];

  return [...fallbackFixtures.slice(0, 3), ...fallbackResults.slice(0, 3)];
}

export async function getLiveMatches(): Promise<Match[]> {
  const data = await fetchFromApi<{ matches: Match[] }>(
    `/competitions/${COMPETITION}/matches?status=LIVE`,
    30
  );

  if (data?.matches?.length) {
    return data.matches;
  }

  return getPremierLeagueMatchesFromFotMob("LIVE");
}

export function isUsingLiveApi(): boolean {
  return Boolean(process.env.FOOTBALL_DATA_API_KEY);
}

export type MatchBoard = {
  live: Match[];
  upcoming: Match[];
  recent: Match[];
};

export async function getMatchBoard(): Promise<MatchBoard> {
  const [live, scheduled, finished] = await Promise.all([
    getLiveMatches(),
    getMatches("SCHEDULED"),
    getMatches("FINISHED"),
  ]);

  const now = Date.now();
  const recentWindowMs = 21 * 24 * 60 * 60 * 1000;
  let recent = finished
    .filter((match) => now - new Date(match.utcDate).getTime() <= recentWindowMs)
    .sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime())
    .slice(0, 12);

  // Off-season / early season: still show the latest real results instead of nothing.
  if (recent.length === 0 && finished.length > 0) {
    recent = finished
      .sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime())
      .slice(0, 12);
  }

  const liveIds = new Set(live.map((match) => match.id));
  const upcoming = scheduled
    .filter(
      (match) =>
        !liveIds.has(match.id) &&
        new Date(match.utcDate).getTime() >= now - 6 * 60 * 60 * 1000
    )
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())
    .slice(0, 24);

  return { live, upcoming, recent };
}
