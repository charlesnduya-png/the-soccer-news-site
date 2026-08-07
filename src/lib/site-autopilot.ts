import { revalidatePath } from "next/cache";
import { getConnectedApis, getSiteControllers } from "@/lib/api-config";
import { getLiveMatches, getMatches, getStandings, isUsingLiveApi } from "@/lib/football-api";
import {
  getKenyanFixtures,
  getKenyanResults,
  getKenyanTeams,
} from "@/lib/kenya-football-api";
import { clearNewsCache, getNewsSnapshot } from "@/lib/news-api";

export type PulseSnapshot = {
  ok: boolean;
  updatedAt: string;
  ageSeconds: number;
  newsCount: number;
  transferCount: number;
  standingsCount: number;
  liveMatchCount: number;
  fixtureCount: number;
  sources: string[];
  connectedApis: ReturnType<typeof getConnectedApis>;
  controllers: string[];
  nextWarmInSeconds: number;
};

type PulseState = {
  updatedAt: number;
  newsCount: number;
  transferCount: number;
  standingsCount: number;
  liveMatchCount: number;
  fixtureCount: number;
  sources: string[];
  lastError: string | null;
};

const WARM_INTERVAL_MS = 3 * 60 * 1000;
const CLIENT_REFRESH_MS = 2 * 60 * 1000;

let pulse: PulseState = {
  updatedAt: 0,
  newsCount: 0,
  transferCount: 0,
  standingsCount: 0,
  liveMatchCount: 0,
  fixtureCount: 0,
  sources: [],
  lastError: null,
};

let warmInFlight: Promise<PulseSnapshot> | null = null;

export function getClientRefreshMs() {
  return CLIENT_REFRESH_MS;
}

export function getWarmIntervalMs() {
  return WARM_INTERVAL_MS;
}

export function isPulseStale(maxAgeMs = WARM_INTERVAL_MS) {
  if (!pulse.updatedAt) return true;
  return Date.now() - pulse.updatedAt >= maxAgeMs;
}

export function getPulseSnapshot(): PulseSnapshot {
  const updatedAt = pulse.updatedAt || Date.now();
  const ageSeconds = pulse.updatedAt
    ? Math.max(0, Math.round((Date.now() - pulse.updatedAt) / 1000))
    : 0;
  const nextWarmInSeconds = pulse.updatedAt
    ? Math.max(0, Math.round((WARM_INTERVAL_MS - (Date.now() - pulse.updatedAt)) / 1000))
    : 0;

  return {
    ok: !pulse.lastError,
    updatedAt: new Date(updatedAt).toISOString(),
    ageSeconds,
    newsCount: pulse.newsCount,
    transferCount: pulse.transferCount,
    standingsCount: pulse.standingsCount,
    liveMatchCount: pulse.liveMatchCount,
    fixtureCount: pulse.fixtureCount,
    sources: pulse.sources,
    connectedApis: getConnectedApis(),
    controllers: getSiteControllers(),
    nextWarmInSeconds,
  };
}

/**
 * Warms news + football caches and revalidates key pages.
 * Safe to call often — concurrent calls share one in-flight warm.
 */
export async function warmSiteData(force = false): Promise<PulseSnapshot> {
  if (!force && !isPulseStale()) {
    return getPulseSnapshot();
  }

  if (warmInFlight) return warmInFlight;

  warmInFlight = (async () => {
    const sources: string[] = [];
    const connected = getConnectedApis();
    const liveFootball = isUsingLiveApi();

    try {
      clearNewsCache();

      if (!liveFootball) sources.push("fallback-football");

      const [
        newsSnapshot,
        transfersSnapshot,
        kenyaNewsSnapshot,
        standings,
        live,
        fixtures,
        kenyaTeams,
        kenyaFixtures,
        kenyaResults,
      ] = await Promise.all([
        getNewsSnapshot(12, "european-leagues"),
        getNewsSnapshot(10, "transfers"),
        getNewsSnapshot(8, "kenyan-football"),
        getStandings(),
        liveFootball ? getLiveMatches() : Promise.resolve([]),
        getMatches("SCHEDULED"),
        getKenyanTeams(),
        getKenyanFixtures(),
        getKenyanResults(),
      ]);

      const news = newsSnapshot.articles;
      const transfers = transfersSnapshot.articles;
      const kenyaNews = kenyaNewsSnapshot.articles;
      sources.push(
        ...newsSnapshot.successfulSources,
        ...transfersSnapshot.successfulSources,
        ...kenyaNewsSnapshot.successfulSources
      );

      if (
        newsSnapshot.isFallback &&
        transfersSnapshot.isFallback &&
        kenyaNewsSnapshot.isFallback
      ) {
        throw new Error("All live news providers are temporarily unavailable");
      }

      if (news.length) sources.push("european-league-news");
      if (transfers.length) sources.push("transfers");
      if (kenyaNews.length) sources.push("kenyan-football-news");
      if (standings.length) sources.push(liveFootball ? "standings" : "standings-fallback");
      if (live.length) sources.push("live-matches");
      if (fixtures.length) sources.push(liveFootball ? "fixtures" : "fixtures-fallback");
      if (kenyaTeams.length) sources.push("kenyan-teams");
      if (kenyaFixtures.length) sources.push("kenyan-fixtures");
      if (kenyaResults.length) sources.push("kenyan-results");

      try {
        revalidatePath("/");
        revalidatePath("/news");
        revalidatePath("/kenya-football");
        revalidatePath("/kenya-football/teams");
        revalidatePath("/kenya-football/fixtures");
        revalidatePath("/kenya-football/results");
        revalidatePath("/transfers");
        revalidatePath("/standings");
        revalidatePath("/fixtures");
        revalidatePath("/results");
      } catch {
        // revalidatePath may be unavailable outside a request context
      }

      pulse = {
        updatedAt: Date.now(),
        newsCount: news.length,
        transferCount: transfers.length,
        standingsCount: standings.length,
        liveMatchCount: live.length,
        fixtureCount: fixtures.length,
        sources: [...new Set(sources)],
        lastError: null,
      };
    } catch (error) {
      pulse = {
        ...pulse,
        lastError: error instanceof Error ? error.message : "Warm failed",
      };
    }

    return getPulseSnapshot();
  })();

  try {
    return await warmInFlight;
  } finally {
    warmInFlight = null;
  }
}
