import type { LiveFixture, MatchIncident } from "./match-types";

const LG_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function teamsMatch(team: string, query: string): boolean {
  const nt = normalize(team);
  const nq = normalize(query);
  return nt.includes(nq) || nq.includes(nt);
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseLiveGoalsPage(html: string): any {
  const m = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );
  if (!m) return null;
  return JSON.parse(m[1]).props?.pageProps;
}

export async function getLiveGoalsFixturesByDate(date: string): Promise<LiveFixture[]> {
  const res = await fetch(`https://www.livegoals.com/?date=${date}`, {
    headers: LG_HEADERS,
    next: { revalidate: 60 },
  });
  if (!res.ok) return [];

  const pp = parseLiveGoalsPage(await res.text());
  if (!pp?.results) return [];

  const fixtures: LiveFixture[] = [];
  for (const block of pp.results) {
    const league = block.tournament_template?.name ?? "Football";
    for (const ev of block.events ?? []) {
      const home = ev.competitors?.[0]?.name ?? "";
      const away = ev.competitors?.[1]?.name ?? "";
      const slug = ev.name?.toLowerCase().replace(/\s+/g, "-") + "-" + ev.id;
      const score = ev.results?.runningscore
        ? `${ev.results.runningscore[0]}-${ev.results.runningscore[1]}`
        : undefined;
      fixtures.push({
        id: ev.id,
        name: ev.name,
        home,
        away,
        status: ev.status,
        score,
        league,
        slug,
        kickoff: ev.start_date,
      });
    }
  }
  return fixtures;
}

export async function findLiveGoalsMatch(
  team1: string,
  team2: string,
  hintDate?: string
): Promise<LiveFixture | null> {
  const dates: string[] = [];

  if (hintDate) {
    const d = hintDate.slice(0, 10);
    dates.push(d);
    const base = new Date(d);
    for (let i = -1; i <= 1; i++) {
      const adj = new Date(base);
      adj.setDate(adj.getDate() + i);
      dates.push(formatDate(adj));
    }
  }

  const today = new Date();
  for (let i = -3; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dates.push(formatDate(d));
  }

  const uniqueDates = Array.from(new Set(dates));

  for (const date of uniqueDates) {
    const fixtures = await getLiveGoalsFixturesByDate(date);
    const upcoming = fixtures.filter(
      (f) =>
        f.status !== "Finished" &&
        ((teamsMatch(f.home, team1) && teamsMatch(f.away, team2)) ||
          (teamsMatch(f.home, team2) && teamsMatch(f.away, team1)))
    );
    if (upcoming.length) {
      upcoming.sort(
        (a, b) =>
          new Date(a.kickoff ?? 0).getTime() - new Date(b.kickoff ?? 0).getTime()
      );
      return upcoming[0];
    }

    const finished = fixtures.find(
      (f) =>
        (teamsMatch(f.home, team1) && teamsMatch(f.away, team2)) ||
        (teamsMatch(f.home, team2) && teamsMatch(f.away, team1))
    );
    if (finished && !hintDate) return finished;
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseIncidents(incidents: any[]): MatchIncident[] {
  return (incidents ?? [])
    .filter((i) => ["goal", "card", "subst"].includes(i.code))
    .slice(0, 15)
    .map((i) => ({
      type: i.type ?? i.code,
      minute: i.match_time ?? 0,
      player: i.player?.name ?? i.player_out?.name,
      team: i.team === "left" ? "home" : i.team === "right" ? "away" : i.team,
      detail: i.detail,
    }));
}

export async function getLiveGoalsMatchDetails(slug: string) {
  const res = await fetch(`https://www.livegoals.com/match/football/${slug}`, {
    headers: LG_HEADERS,
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;

  const pp = parseLiveGoalsPage(await res.text());
  if (!pp?.data) return null;

  const data = pp.data;
  const incidents = parseIncidents(pp.incidents ?? []);

  return {
    matchId: String(data.id),
    status: data.status,
    venue: data.properties?.VenueName,
    kickoff: data.start_date,
    score: data.results?.runningscore
      ? `${data.results.runningscore[0]}-${data.results.runningscore[1]}`
      : undefined,
    liveScore: data.results?.runningscore
      ? {
          home: Number(data.results.runningscore[0]),
          away: Number(data.results.runningscore[1]),
          halftime: data.results?.halftime
            ? `${data.results.halftime[0]}-${data.results.halftime[1]}`
            : undefined,
        }
      : undefined,
    incidents,
    league: data.competition?.name ?? data.tournament_template?.name,
  };
}

export async function fetchLiveGoalsIntelligence(
  team1: string,
  team2: string,
  hintDate?: string
) {
  const fixture = await findLiveGoalsMatch(team1, team2, hintDate);
  if (!fixture) return null;

  const details = await getLiveGoalsMatchDetails(fixture.slug);
  return { fixture, details };
}

export async function getTodayLiveFixtures(): Promise<LiveFixture[]> {
  return getLiveGoalsFixturesByDate(formatDate(new Date()));
}

export async function getUpcomingFixturesFromLiveGoals(
  daysAhead = 14
): Promise<LiveFixture[]> {
  const today = new Date();
  const all: LiveFixture[] = [];

  for (let i = 0; i <= daysAhead; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const fixtures = await getLiveGoalsFixturesByDate(formatDate(d));
    for (const f of fixtures) {
      if (f.status !== "Finished") all.push(f);
    }
  }

  all.sort(
    (a, b) =>
      new Date(a.kickoff ?? 0).getTime() - new Date(b.kickoff ?? 0).getTime()
  );

  return all;
}
