import { extractTeamsFromMessages } from "./coach";
import { fetchFotMobIntelligence } from "./fotmob";
import { fetchLiveGoalsIntelligence } from "./livegoals";
import type { MatchIntelligence } from "./match-types";

export function formatMatchContextForAI(intel: MatchIntelligence): string {
  const lines: string[] = [
    `=== LIVE MATCH DATA (use this in your analysis) ===`,
    `Fixture: ${intel.team1} vs ${intel.team2}`,
    `League: ${intel.league ?? "Unknown"}`,
    `Status: ${intel.status ?? "Scheduled"}`,
    `Kickoff: ${intel.kickoff ?? "TBC"}`,
    `Lineups: ${intel.lineupLabel ?? "FotMob data"}`,
  ];

  if (intel.isUpcoming) lines.push(`This is an UPCOMING match — use predicted lineups.`);
  if (intel.score) lines.push(`Score: ${intel.score}`);
  if (intel.venue) lines.push(`Venue: ${intel.venue}`);
  if (intel.xg) lines.push(`xG: ${intel.team1} ${intel.xg.home} — ${intel.team2} ${intel.xg.away}`);
  if (intel.h2hSummary) lines.push(intel.h2hSummary);

  if (intel.homeLineup?.starters.length) {
    lines.push(
      `\n${intel.lineupLabel ?? "Lineup"} — ${intel.homeLineup.teamName} (${intel.homeLineup.formation ?? "TBC"}):`,
      intel.homeLineup.starters.map((p) => p.name).join(", ")
    );
    if (intel.homeLineup.unavailable.length) {
      lines.push(`Unavailable: ${intel.homeLineup.unavailable.join(", ")}`);
    }
  }

  if (intel.awayLineup?.starters.length) {
    lines.push(
      `\n${intel.lineupLabel ?? "Lineup"} — ${intel.awayLineup.teamName} (${intel.awayLineup.formation ?? "TBC"}):`,
      intel.awayLineup.starters.map((p) => p.name).join(", ")
    );
    if (intel.awayLineup.unavailable.length) {
      lines.push(`Unavailable: ${intel.awayLineup.unavailable.join(", ")}`);
    }
  }

  if (intel.incidents?.length) {
    lines.push(`\nMatch Events (LiveGoals):`);
    for (const inc of intel.incidents.slice(0, 8)) {
      lines.push(`• ${inc.minute}' ${inc.type}: ${inc.player ?? ""}`);
    }
  }

  lines.push(`Data sources: ${intel.sources.join(" + ")}`);
  return lines.join("\n");
}

export async function fetchMatchIntelligence(
  team1: string,
  team2: string
): Promise<MatchIntelligence | null> {
  const livegoals = await fetchLiveGoalsIntelligence(team1, team2).catch(() => null);

  const upcomingFixture =
    livegoals?.fixture?.status !== "Finished" ? livegoals?.fixture : null;

  const fotmob = await fetchFotMobIntelligence(
    team1,
    team2,
    upcomingFixture ? String(upcomingFixture.id) : undefined
  ).catch(() => null);

  if (!fotmob && !livegoals) return null;

  const sources: ("fotmob" | "livegoals")[] = [];
  if (fotmob?.parsed) sources.push("fotmob");
  if (livegoals?.details || livegoals?.fixture) sources.push("livegoals");

  const intel: MatchIntelligence = {
    team1:
      fotmob?.parsed?.homeLineup?.teamName ??
      fotmob?.search?.homeName ??
      livegoals?.fixture?.home ??
      team1,
    team2:
      fotmob?.parsed?.awayLineup?.teamName ??
      fotmob?.search?.awayName ??
      livegoals?.fixture?.away ??
      team2,
    sources,
  };

  if (fotmob?.parsed) {
    Object.assign(intel, {
      matchId: fotmob.parsed.matchId,
      league: fotmob.parsed.league || fotmob.search?.leagueName,
      kickoff: fotmob.parsed.kickoff || fotmob.search?.matchDate,
      status: fotmob.parsed.status,
      score: fotmob.parsed.score,
      venue: fotmob.parsed.venue,
      lineupType: fotmob.parsed.lineupType,
      lineupLabel: fotmob.parsed.lineupLabel,
      isUpcoming: fotmob.parsed.isUpcoming,
      homeLineup: fotmob.parsed.homeLineup,
      awayLineup: fotmob.parsed.awayLineup,
      xg: fotmob.parsed.xg,
      h2hSummary: fotmob.parsed.h2hSummary,
    });
  }

  if (livegoals?.fixture && livegoals.fixture.status !== "Finished") {
    intel.isUpcoming = true;
    intel.status = intel.status === "Finished" ? "Upcoming" : intel.status ?? "Upcoming";
    if (!intel.kickoff) intel.kickoff = livegoals.fixture.kickoff;
    if (!intel.league) intel.league = livegoals.fixture.league;
  }

  if (livegoals?.details) {
    intel.matchId = intel.matchId ?? livegoals.details.matchId;
    intel.league = intel.league ?? livegoals.details.league ?? livegoals.fixture?.league;
    intel.kickoff = intel.kickoff ?? livegoals.details.kickoff;
    if (livegoals.details.status !== "Finished") {
      intel.status = "Upcoming";
      intel.isUpcoming = true;
    } else {
      intel.status = livegoals.details.status ?? intel.status;
      intel.score = livegoals.details.score ?? intel.score;
      intel.liveScore = livegoals.details.liveScore;
      intel.incidents = livegoals.details.incidents;
    }
    intel.venue = intel.venue ?? livegoals.details.venue;
    if (!sources.includes("livegoals")) sources.push("livegoals");
  }

  intel.sources = sources;
  return intel;
}

export async function getIntelligenceFromMessage(
  message: string
): Promise<MatchIntelligence | null> {
  const teams = extractTeamsFromMessages([{ role: "user", content: message }]);
  if (!teams) return null;
  return fetchMatchIntelligence(teams.team1, teams.team2);
}

export async function getIntelligenceFromConversation(
  messages: import("./types").ChatMessage[]
): Promise<MatchIntelligence | null> {
  const teams = extractTeamsFromMessages(messages);
  if (!teams) return null;
  return fetchMatchIntelligence(teams.team1, teams.team2);
}
