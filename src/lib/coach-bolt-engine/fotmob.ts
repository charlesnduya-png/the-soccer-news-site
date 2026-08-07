const FOTMOB_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
};

const FINISHED_STATUS_IDS = new Set([6, 7, 8]);

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function teamsMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  return na.includes(nb) || nb.includes(na) || na.split(" ").pop() === nb.split(" ").pop();
}

function isWomensTeam(name: string): boolean {
  return /\(W\)|women/i.test(name);
}

function isUpcomingDate(dateStr: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr).getTime() > Date.now() - 2 * 60 * 60 * 1000;
}

export interface FotMobSearchResult {
  matchId: string;
  homeName: string;
  awayName: string;
  leagueName: string;
  matchDate: string;
  statusId: number;
  homeScore?: number;
  awayScore?: number;
  isUpcoming: boolean;
}

function pickBestMatch(
  options: { payload?: Record<string, unknown> }[],
  team1: string,
  team2: string
): FotMobSearchResult | null {
  const matches: FotMobSearchResult[] = [];

  for (const opt of options) {
    const p = opt.payload;
    if (!p) continue;
    const home = String(p.homeName ?? "");
    const away = String(p.awayName ?? "");
    if (isWomensTeam(home) || isWomensTeam(away)) continue;

    const matchesTeams =
      (teamsMatch(home, team1) && teamsMatch(away, team2)) ||
      (teamsMatch(home, team2) && teamsMatch(away, team1));
    if (!matchesTeams) continue;

    const statusId = Number(p.statusId ?? 0);
    const matchDate = String(p.matchDate ?? "");
    const upcoming =
      isUpcomingDate(matchDate) && !FINISHED_STATUS_IDS.has(statusId);

    matches.push({
      matchId: String(p.id),
      homeName: home,
      awayName: away,
      leagueName: String(p.leagueName ?? ""),
      matchDate,
      statusId,
      homeScore: p.homeScore as number | undefined,
      awayScore: p.awayScore as number | undefined,
      isUpcoming: upcoming,
    });
  }

  if (!matches.length) return null;

  matches.sort((a, b) => {
    if (a.isUpcoming !== b.isUpcoming) return a.isUpcoming ? -1 : 1;
    const da = new Date(a.matchDate).getTime();
    const db = new Date(b.matchDate).getTime();
    const now = Date.now();
    if (a.isUpcoming && b.isUpcoming) return da - db;
    return Math.abs(da - now) - Math.abs(db - now);
  });

  return matches[0];
}

export async function searchFotMobMatch(
  team1: string,
  team2: string
): Promise<FotMobSearchResult | null> {
  const term = encodeURIComponent(`${team1} ${team2}`);
  const res = await fetch(
    `https://apigw.fotmob.com/searchapi/suggest?term=${term}`,
    { headers: FOTMOB_HEADERS, next: { revalidate: 300 } }
  );
  if (!res.ok) return null;

  const data = await res.json();
  const options = data.matchSuggest?.[0]?.options ?? [];
  return pickBestMatch(options, team1, team2);
}

export function getLineupLabel(
  lineupType: string | undefined,
  isUpcoming: boolean,
  finished: boolean
): "Predicted XI" | "Confirmed XI" | "Last Starting XI" {
  if (lineupType === "lastStarting11" || (isUpcoming && !finished)) {
    return "Predicted XI";
  }
  if (finished) return "Confirmed XI";
  return "Last Starting XI";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePlayer(p: any): import("./match-types").PlayerLineup {
  const name =
    typeof p?.name === "string"
      ? p.name
      : (p?.name?.fullName ?? `${p?.firstName ?? ""} ${p?.lastName ?? ""}`.trim()) || "Unknown";
  const id = p?.id ? Number(p.id) : undefined;
  const layout = p?.verticalLayout
    ? { x: Number(p.verticalLayout.x), y: Number(p.verticalLayout.y) }
    : undefined;

  return {
    name,
    position: p?.positionId ? String(p.positionId) : p?.role,
    shirtNumber: p?.shirtNumber ? String(p.shirtNumber) : undefined,
    id,
    layout,
    imageUrl: id
      ? `https://images.fotmob.com/image_resources/playerimages/${id}.png`
      : undefined,
    rating: p?.performance?.rating ? Number(p.performance.rating) : undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseFotMobMatchDetails(
  data: any,
  team1: string,
  team2: string,
  searchMeta?: FotMobSearchResult | null
) {
  const general = data?.general ?? {};
  const header = data?.header ?? {};
  const content = data?.content ?? {};
  const lineup = content?.lineup;
  const status = header?.status;
  const finished = Boolean(status?.finished);
  const isUpcoming =
    searchMeta?.isUpcoming ??
    (isUpcomingDate(status?.utcTime ?? "") && !finished);

  const homeLineup = lineup?.homeTeam;
  const awayLineup = lineup?.awayTeam;
  const lineupType = lineup?.lineupType ?? "standard";
  const lineupLabel = getLineupLabel(lineupType, isUpcoming, finished);

  let xgHome = "";
  let xgAway = "";
  const statGroups = content?.stats?.Periods?.All?.stats ?? [];
  for (const group of statGroups) {
    for (const stat of group?.stats ?? []) {
      if (stat?.key === "expected_goals" && stat?.stats?.[0] && stat?.stats?.[1]) {
        xgHome = String(stat.stats[0]);
        xgAway = String(stat.stats[1]);
      }
    }
  }

  const h2h = content?.h2h;
  let h2hSummary = "";
  if (h2h?.summary?.[0]) {
    const s = h2h.summary[0];
    h2hSummary = `H2H: ${s.home ?? 0} home wins, ${s.draw ?? 0} draws, ${s.away ?? 0} away wins`;
  }

  let statusLabel = status?.reason?.long ?? "Scheduled";
  if (isUpcoming && !finished) statusLabel = "Upcoming";
  if (status?.started && !finished) statusLabel = "Live";

  return {
    matchId: String(general.matchId ?? ""),
    league: general.leagueName ?? general.parentLeagueName ?? "",
    kickoff: status?.utcTime ?? searchMeta?.matchDate ?? "",
    status: statusLabel,
    score: finished ? status?.scoreStr ?? "" : "",
    venue: general.venue ?? "",
    lineupType,
    lineupLabel,
    isUpcoming,
    homeLineup: homeLineup
      ? {
          teamName: homeLineup.name ?? team1,
          formation: homeLineup.formation,
          starters: (homeLineup.starters ?? []).map(parsePlayer),
          subs: (homeLineup.subs ?? []).map(parsePlayer),
          unavailable: (homeLineup.unavailable ?? []).map(
            (u: { name?: string }) => u?.name ?? "Unknown"
          ),
        }
      : undefined,
    awayLineup: awayLineup
      ? {
          teamName: awayLineup.name ?? team2,
          formation: awayLineup.formation,
          starters: (awayLineup.starters ?? []).map(parsePlayer),
          subs: (awayLineup.subs ?? []).map(parsePlayer),
          unavailable: (awayLineup.unavailable ?? []).map(
            (u: { name?: string }) => u?.name ?? "Unknown"
          ),
        }
      : undefined,
    xg: xgHome && finished ? { home: xgHome, away: xgAway } : undefined,
    h2hSummary,
  };
}

export async function getFotMobMatchDetails(matchId: string) {
  const res = await fetch(
    `https://www.fotmob.com/api/data/matchDetails?matchId=${matchId}`,
    { headers: FOTMOB_HEADERS, next: { revalidate: 120 } }
  );
  if (!res.ok) return null;
  return res.json();
}

export async function fetchFotMobIntelligence(
  team1: string,
  team2: string,
  overrideMatchId?: string
) {
  const search = overrideMatchId
    ? null
    : await searchFotMobMatch(team1, team2);

  const matchId = overrideMatchId ?? search?.matchId;
  if (!matchId) return null;

  const details = await getFotMobMatchDetails(matchId);
  if (!details) return { search, parsed: null };

  const home = search?.homeName ?? team1;
  const away = search?.awayName ?? team2;
  const parsed = parseFotMobMatchDetails(details, home, away, search);
  return { search, parsed };
}

export async function fetchUpcomingMatchesWithLineups(
  limit = 8
): Promise<import("./match-types").UpcomingMatch[]> {
  const { getUpcomingFixturesFromLiveGoals } = await import("./livegoals");
  const fixtures = await getUpcomingFixturesFromLiveGoals(10);

  const leagueRank = (league: string): number => {
    const l = league.toLowerCase();
    const tiers = [
      "premier league",
      "champions league",
      "world cup",
      "la liga",
      "serie a",
      "bundesliga",
      "ligue 1",
      "europa league",
      "conference league",
      "mls",
      "eredivisie",
      "primeira liga",
      "fa cup",
      "copa del rey",
      "dfb pokal",
      "copa america",
      "nations league",
    ];
    const idx = tiers.findIndex((t) => l.includes(t));
    return idx >= 0 ? idx : 50;
  };

  const ranked = fixtures
    .filter((f) => f.status !== "Finished")
    .sort((a, b) => {
      const lr = leagueRank(a.league) - leagueRank(b.league);
      if (lr !== 0) return lr;
      return (
        new Date(a.kickoff ?? 0).getTime() - new Date(b.kickoff ?? 0).getTime()
      );
    })
    .slice(0, 24);

  const results: import("./match-types").UpcomingMatch[] = [];

  for (let i = 0; i < ranked.length && results.length < limit; i += 4) {
    const batch = ranked.slice(i, i + 4);
    const settled = await Promise.allSettled(
      batch.map(async (fix) => {
        const intel = await fetchFotMobIntelligence(fix.home, fix.away, String(fix.id));
        if (!intel?.parsed?.homeLineup?.starters.length) return null;
        return {
          matchId: String(fix.id),
          home: intel.parsed.homeLineup.teamName,
          away: intel.parsed.awayLineup?.teamName ?? fix.away,
          league: fix.league,
          kickoff: intel.parsed.kickoff || fix.kickoff || "",
          status: intel.parsed.status,
          homeFormation: intel.parsed.homeLineup.formation,
          awayFormation: intel.parsed.awayLineup?.formation,
          homeStarters: intel.parsed.homeLineup.starters.map((p: { name: string }) => p.name),
          awayStarters:
            intel.parsed.awayLineup?.starters.map((p: { name: string }) => p.name) ?? [],
          lineupLabel: intel.parsed.lineupLabel ?? "Predicted XI",
        } satisfies import("./match-types").UpcomingMatch;
      })
    );

    for (const r of settled) {
      if (r.status === "fulfilled" && r.value) results.push(r.value);
    }
  }

  return results.slice(0, limit);
}
