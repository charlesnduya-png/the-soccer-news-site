import type { Match, Team } from "@/lib/types";

const API_BASE = "https://www.thesportsdb.com/api/v1/json/3";
const LEAGUE_ID = "4745";
const KENYAN_SEASONS = ["2025-2026", "2024-2025", "2023-2024"];

const genericCrest = "/logo.png";

export type KenyanMatchBoard = {
  live: Match[];
  upcoming: Match[];
  recent: Match[];
};

const fallbackKenyanTeams: Team[] = [
  kenyaTeam(139256, "AFC Leopards", "AFC", "Dandora Stadium", "https://r2.thesportsdb.com/images/media/team/badge/4taj3p1583767536.png"),
  kenyaTeam(146876, "APS Bomet", "APS", "Bomet Stadium", "https://r2.thesportsdb.com/images/media/team/badge/480ss31660940507.png"),
  kenyaTeam(139248, "Bandari FC", "BAN", "Mombasa Sports Club", "https://r2.thesportsdb.com/images/media/team/badge/j0k5hr1583767461.png"),
  kenyaTeam(141168, "Bidco United FC", "BID", "Thika Stadium", "https://r2.thesportsdb.com/images/media/team/badge/7kovoy1616161037.png"),
  kenyaTeam(139253, "Gor Mahia", "GOR", "Kenyatta Stadium", "https://r2.thesportsdb.com/images/media/team/badge/8hqogn1583765598.png"),
  kenyaTeam(139255, "Kakamega Homeboyz", "KAK", "Mumias Sports Complex", "https://r2.thesportsdb.com/images/media/team/badge/jk0iy41583764938.png"),
  kenyaTeam(139241, "Kariobangi Sharks", "KSH", "Police Stadium", "https://r2.thesportsdb.com/images/media/team/badge/3byxk61583357154.png"),
  kenyaTeam(139250, "KCB FC", "KCB", "Police Stadium", "https://r2.thesportsdb.com/images/media/team/badge/ewpyvl1583765049.png"),
  kenyaTeam(144127, "Kenya Police FC", "POL", "Police Sacco Stadium", "https://r2.thesportsdb.com/images/media/team/badge/8rc7kn1776296960.png"),
  kenyaTeam(149284, "Mara Sugar", "MAR", "Green Stadium Awendo", "https://r2.thesportsdb.com/images/media/team/badge/xycge61726169941.png"),
  kenyaTeam(139247, "Mathare United FC", "MAT", "Dandora Stadium", genericCrest),
  kenyaTeam(147552, "Murang'a Seal", "MUR", "St. Sebastian Park", "https://r2.thesportsdb.com/images/media/team/badge/yb7j381689947933.png"),
  kenyaTeam(153217, "Nairobi United", "NAI", "Nairobi", genericCrest),
  kenyaTeam(139252, "Posta Rangers", "POS", "Kenyatta Stadium", genericCrest),
  kenyaTeam(147553, "Shabana", "SHA", "Gusii Stadium", "https://r2.thesportsdb.com/images/media/team/badge/bnu4ha1689948335.png"),
  kenyaTeam(139251, "Sofapaka", "SOF", "Kenyatta Stadium", "https://r2.thesportsdb.com/images/media/team/badge/p7qrgw1583406664.png"),
  kenyaTeam(139254, "Tusker FC", "TUS", "Kenyatta Stadium", "https://r2.thesportsdb.com/images/media/team/badge/9rnoc81583406233.png"),
  kenyaTeam(139246, "Ulinzi Stars", "ULI", "Ulinzi Sports Complex", "https://r2.thesportsdb.com/images/media/team/badge/5hzcu31583357971.png"),
];

const kenyanTeamIds = new Set(fallbackKenyanTeams.map((team) => team.id));

function kenyaTeam(
  id: number,
  name: string,
  tla: string,
  venue: string,
  crest: string
): Team {
  return { id, name, shortName: name, tla, venue, crest };
}

type SportsDbTeam = {
  idTeam: string;
  strTeam: string;
  strTeamShort?: string | null;
  strStadium?: string | null;
  strBadge?: string | null;
  strCountry?: string | null;
};

type SportsDbEvent = {
  idEvent: string;
  strTimestamp?: string | null;
  dateEvent?: string | null;
  strTime?: string | null;
  strStatus?: string | null;
  intRound?: string | null;
  idHomeTeam?: string | null;
  idAwayTeam?: string | null;
  strHomeTeam: string;
  strAwayTeam: string;
  strHomeTeamBadge?: string | null;
  strAwayTeamBadge?: string | null;
  intHomeScore?: string | null;
  intAwayScore?: string | null;
  idLeague?: string | null;
  strLeague?: string | null;
  strCountry?: string | null;
};

async function fetchSportsDb<T>(path: string, revalidate: number): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      next: { revalidate },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function mapInBatches<T, R>(
  items: T[],
  batchSize: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    const batchResults = await Promise.all(batch.map(mapper));
    results.push(...batchResults);
  }
  return results;
}

export async function getKenyanTeams(): Promise<Team[]> {
  const data = await fetchSportsDb<{ teams?: SportsDbTeam[] }>(
    "/search_all_teams.php?l=Kenyan%20Premier%20League",
    86_400
  );

  const apiTeams = (data?.teams ?? [])
    .filter((team) => team.strCountry === "Kenya")
    .map((team) => {
      const fallback = fallbackKenyanTeams.find(
        (item) => item.id === Number(team.idTeam)
      );
      return kenyaTeam(
        Number(team.idTeam),
        team.strTeam,
        team.strTeamShort || fallback?.tla || initials(team.strTeam),
        team.strStadium || fallback?.venue || "Kenya",
        team.strBadge || fallback?.crest || genericCrest
      );
    });

  const byId = new Map(fallbackKenyanTeams.map((team) => [team.id, team]));
  for (const team of apiTeams) byId.set(team.id, team);
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function isKenyanEvent(event: SportsDbEvent): boolean {
  if (event.idLeague === LEAGUE_ID) return true;
  if (event.strCountry === "Kenya") return true;
  if ((event.strLeague ?? "").toLowerCase().includes("kenyan premier")) return true;

  const homeId = Number(event.idHomeTeam);
  const awayId = Number(event.idAwayTeam);
  return kenyanTeamIds.has(homeId) || kenyanTeamIds.has(awayId);
}

async function collectSeasonEvents(): Promise<SportsDbEvent[]> {
  const responses = await Promise.all(
    KENYAN_SEASONS.map((season) =>
      fetchSportsDb<{ events?: SportsDbEvent[] | null }>(
        `/eventsseason.php?id=${LEAGUE_ID}&s=${season}`,
        900
      )
    )
  );

  return responses.flatMap((response) => response?.events ?? []);
}

async function collectLeagueEvents(): Promise<SportsDbEvent[]> {
  const [next, past, ...seasonEvents] = await Promise.all([
    fetchSportsDb<{ events?: SportsDbEvent[] | null }>(
      `/eventsnextleague.php?id=${LEAGUE_ID}`,
      900
    ),
    fetchSportsDb<{ events?: SportsDbEvent[] | null }>(
      `/eventspastleague.php?id=${LEAGUE_ID}`,
      900
    ),
    ...KENYAN_SEASONS.map((season) =>
      fetchSportsDb<{ events?: SportsDbEvent[] | null }>(
        `/eventsseason.php?id=${LEAGUE_ID}&s=${season}`,
        900
      )
    ),
  ]);

  return [
    ...(next?.events ?? []),
    ...(past?.events ?? []),
    ...seasonEvents.flatMap((response) => response?.events ?? []),
  ];
}

async function collectTeamEvents(teams: Team[]): Promise<SportsDbEvent[]> {
  const teamEvents = await mapInBatches(teams, 6, async (team) => {
    const [next, last] = await Promise.all([
      fetchSportsDb<{ events?: SportsDbEvent[] | null }>(
        `/eventsnext.php?id=${team.id}`,
        900
      ),
      fetchSportsDb<{ results?: SportsDbEvent[] | null }>(
        `/eventslast.php?id=${team.id}`,
        900
      ),
    ]);

    return [...(next?.events ?? []), ...(last?.results ?? [])];
  });

  return teamEvents.flat();
}

async function collectKenyanEvents(): Promise<SportsDbEvent[]> {
  const teams = await getKenyanTeams();
  const events = await Promise.all([collectLeagueEvents(), collectTeamEvents(teams)]);
  const unique = new Map<string, SportsDbEvent>();

  for (const event of events.flat()) {
    if (!isKenyanEvent(event)) continue;
    unique.set(event.idEvent, event);
  }

  return [...unique.values()];
}

function parseScore(value: string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapSportsDbStatus(event: SportsDbEvent): string {
  const status = (event.strStatus ?? "").trim().toUpperCase();
  const home = parseScore(event.intHomeScore);
  const away = parseScore(event.intAwayScore);

  if (["1H", "2H", "LIVE", "IN PLAY", "IN_PLAY", "ET", "BT", "P", "PEN"].includes(status)) {
    return status === "HT" ? "PAUSED" : "IN_PLAY";
  }
  if (status === "HT") return "PAUSED";
  if (status === "POSTPONED") return "POSTPONED";
  if (status === "CANCELLED") return "CANCELLED";
  if (status === "FT" || status === "AET" || status === "PEN") return "FINISHED";
  if (status === "NS" || status === "TBD" || status === "NOT STARTED" || status === "") {
    return "SCHEDULED";
  }
  if (home !== null && away !== null) return "FINISHED";
  return "SCHEDULED";
}

function isFinishedStatus(status: string): boolean {
  return status === "FINISHED";
}

function isLiveStatus(status: string): boolean {
  return ["IN_PLAY", "PAUSED", "LIVE"].includes(status);
}

function eventTeam(
  id: string | null | undefined,
  name: string,
  crest?: string | null
): Team {
  const known = fallbackKenyanTeams.find(
    (team) => team.id === Number(id) || team.name.replace(/ FC$/, "") === name
  );
  return {
    id: Number(id) || known?.id || Math.abs(hashCode(name)),
    name,
    shortName: name,
    tla: known?.tla || initials(name),
    crest: crest || known?.crest || genericCrest,
    venue: known?.venue,
  };
}

function toMatch(event: SportsDbEvent): Match {
  const home = parseScore(event.intHomeScore);
  const away = parseScore(event.intAwayScore);
  const status = mapSportsDbStatus(event);
  const utcDate =
    event.strTimestamp ||
    `${event.dateEvent ?? "1970-01-01"}T${event.strTime ?? "12:00:00"}Z`;

  return {
    id: Number(event.idEvent),
    utcDate,
    status,
    matchday: event.intRound ? Number(event.intRound) : null,
    stage: "REGULAR_SEASON",
    competition: event.strLeague || "Kenyan Premier League",
    homeTeam: eventTeam(event.idHomeTeam, event.strHomeTeam, event.strHomeTeamBadge),
    awayTeam: eventTeam(event.idAwayTeam, event.strAwayTeam, event.strAwayTeamBadge),
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

function byDate(a: Match, b: Match): number {
  return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();
}

function splitKenyanMatches(matches: Match[]): KenyanMatchBoard {
  const now = Date.now();
  const live = matches.filter((match) => isLiveStatus(match.status)).sort(byDate);
  const recent = matches
    .filter((match) => isFinishedStatus(match.status))
    .sort((a, b) => byDate(b, a))
    .slice(0, 18);
  const upcoming = matches
    .filter((match) => {
      if (isFinishedStatus(match.status) || isLiveStatus(match.status)) return false;
      return new Date(match.utcDate).getTime() >= now - 6 * 60 * 60 * 1000;
    })
    .sort(byDate)
    .slice(0, 18);

  return { live, upcoming, recent };
}

export async function getKenyanMatchBoard(): Promise<KenyanMatchBoard> {
  const events = await collectKenyanEvents();
  return splitKenyanMatches(events.map(toMatch));
}

export async function getKenyanFixtures(): Promise<Match[]> {
  const board = await getKenyanMatchBoard();
  if (board.live.length > 0 || board.upcoming.length > 0) {
    return [...board.live, ...board.upcoming];
  }
  return board.recent.slice(0, 12);
}

export async function getKenyanResults(): Promise<Match[]> {
  const board = await getKenyanMatchBoard();
  return board.recent;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function hashCode(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return hash;
}
