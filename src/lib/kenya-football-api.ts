import type { Match, Team } from "@/lib/types";

/** Free-tier public key is `123`. Paid/dev keys go in THESPORTSDB_API_KEY. Key `3` is blocked (403). */
const SPORTSDB_KEY = process.env.THESPORTSDB_API_KEY?.trim() || "123";
const API_BASE = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_KEY}`;
const LEAGUE_ID = "4745";
const KENYAN_SEASONS = ["2026-2027", "2025-2026", "2024-2025", "2023-2024"];
const FETCH_GAP_MS = 200;
const BOARD_TTL_MS = 90_000;

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

let boardCache: { at: number; board: KenyanMatchBoard } | null = null;
let lastGoodBoard: KenyanMatchBoard | null = null;
let boardInflight: Promise<KenyanMatchBoard> | null = null;

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
  strPostponed?: string | null;
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSportsDb<T>(path: string, revalidate: number): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      next: { revalidate },
      signal: AbortSignal.timeout(10_000),
      headers: {
        "User-Agent": "soccer.co.ke/1.0 (+https://soccer.co.ke)",
        Accept: "application/json",
      },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function getKenyanTeams(): Promise<Team[]> {
  const data = await fetchSportsDb<{ teams?: SportsDbTeam[] }>(
    "/search_all_teams.php?l=Kenyan%20Premier%20League",
    86_400
  );

  const apiTeams = (data?.teams ?? [])
    .filter((team) => !team.strCountry || team.strCountry === "Kenya")
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

/** Strict KPL-only — excludes CAF, friendlies, and other club competitions. */
function isKplEvent(event: SportsDbEvent): boolean {
  if (event.idLeague === LEAGUE_ID) return true;
  const league = (event.strLeague ?? "").toLowerCase();
  return (
    league.includes("kenyan premier") ||
    league.includes("kenya premier") ||
    league.includes("fkf premier") ||
    league.includes("sportpesa premier")
  );
}

function bothTeamsAreKplClubs(event: SportsDbEvent): boolean {
  const homeId = Number(event.idHomeTeam);
  const awayId = Number(event.idAwayTeam);
  const homeKnown =
    kenyanTeamIds.has(homeId) ||
    fallbackKenyanTeams.some((team) =>
      namesMatch(team.name, event.strHomeTeam)
    );
  const awayKnown =
    kenyanTeamIds.has(awayId) ||
    fallbackKenyanTeams.some((team) =>
      namesMatch(team.name, event.strAwayTeam)
    );
  return homeKnown && awayKnown;
}

function namesMatch(a: string, b: string): boolean {
  const norm = (value: string) =>
    value.toLowerCase().replace(/\s+fc$/i, "").replace(/[^a-z0-9]/g, "");
  const na = norm(a);
  const nb = norm(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

/**
 * League endpoints only — sequential + short gap so free-tier SportsDB
 * does not 429 when fixtures/results/autopilot hit the board together.
 */
async function collectKplEvents(): Promise<SportsDbEvent[]> {
  const paths = [
    `/eventsnextleague.php?id=${LEAGUE_ID}`,
    `/eventspastleague.php?id=${LEAGUE_ID}`,
    ...KENYAN_SEASONS.map(
      (season) => `/eventsseason.php?id=${LEAGUE_ID}&s=${season}`
    ),
  ];

  const responses: Array<{ events?: SportsDbEvent[] | null } | null> = [];
  // Fetch in pairs — faster than fully serial, safer than blasting all at once.
  for (let index = 0; index < paths.length; index += 2) {
    if (index > 0) await sleep(FETCH_GAP_MS);
    const batch = paths.slice(index, index + 2);
    const batchResults = await Promise.all(
      batch.map((path, batchIndex) =>
        fetchSportsDb<{ events?: SportsDbEvent[] | null }>(
          path,
          index + batchIndex < 2 ? 900 : 1800
        )
      )
    );
    responses.push(...batchResults);
  }

  const unique = new Map<string, SportsDbEvent>();
  for (const event of responses.flatMap((response) => response?.events ?? [])) {
    if (!isKplEvent(event) && !bothTeamsAreKplClubs(event)) continue;
    const league = (event.strLeague ?? "").toLowerCase();
    if (
      league.includes("caf") ||
      league.includes("champions") ||
      league.includes("confederation") ||
      league.includes("friendly") ||
      league.includes("world cup")
    ) {
      continue;
    }
    if (!isKplEvent(event)) continue;
    unique.set(event.idEvent, event);
  }

  return [...unique.values()];
}

function parseScore(value: string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function eventKickoffMs(event: SportsDbEvent): number {
  const raw =
    event.strTimestamp ||
    `${event.dateEvent ?? "1970-01-01"}T${(event.strTime || "12:00:00").slice(0, 8)}Z`;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : 0;
}

function mapSportsDbStatus(event: SportsDbEvent): string {
  const status = (event.strStatus ?? "").trim().toUpperCase();
  const postponed = (event.strPostponed ?? "").trim().toLowerCase();
  const home = parseScore(event.intHomeScore);
  const away = parseScore(event.intAwayScore);
  const kickoff = eventKickoffMs(event);
  const now = Date.now();

  if (postponed === "yes" || status === "PST" || status === "POSTPONED") {
    return "POSTPONED";
  }

  // Trust kickoff time over messy provider status strings.
  if (kickoff > now + 10 * 60 * 1000) return "SCHEDULED";
  if (
    home !== null &&
    away !== null &&
    kickoff > 0 &&
    kickoff < now - 2.5 * 60 * 60 * 1000
  ) {
    return "FINISHED";
  }

  if (["1H", "2H", "LIVE", "IN PLAY", "IN_PLAY", "ET", "BT", "P"].includes(status)) {
    return "IN_PLAY";
  }
  if (status === "HT") return "PAUSED";
  if (status === "CANCELLED") return "CANCELLED";
  if (status === "FT" || status === "AET" || status === "PEN") return "FINISHED";
  if (status === "NS" || status === "TBD" || status === "NOT STARTED" || status === "") {
    if (home !== null && away !== null) return "FINISHED";
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
    (team) => team.id === Number(id) || namesMatch(team.name, name)
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
      if (match.status === "POSTPONED" || match.status === "CANCELLED") return false;
      return new Date(match.utcDate).getTime() >= now - 6 * 60 * 60 * 1000;
    })
    .sort(byDate)
    .slice(0, 18);

  return { live, upcoming, recent };
}

function boardHasMatches(board: KenyanMatchBoard): boolean {
  return board.live.length + board.upcoming.length + board.recent.length > 0;
}

async function loadKenyanMatchBoard(): Promise<KenyanMatchBoard> {
  const events = await collectKplEvents();
  const board = splitKenyanMatches(events.map(toMatch));
  if (boardHasMatches(board)) {
    lastGoodBoard = board;
    return board;
  }
  return lastGoodBoard ?? board;
}

export async function getKenyanMatchBoard(): Promise<KenyanMatchBoard> {
  const now = Date.now();
  if (boardCache && now - boardCache.at < BOARD_TTL_MS) {
    return boardCache.board;
  }
  if (boardInflight) return boardInflight;

  boardInflight = loadKenyanMatchBoard()
    .then((board) => {
      boardCache = { at: Date.now(), board };
      return board;
    })
    .finally(() => {
      boardInflight = null;
    });

  return boardInflight;
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
