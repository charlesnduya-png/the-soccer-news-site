import type { CompetitionInfo, Match, Scorer, StandingRow } from "./types";

const crest = (id: number) =>
  `https://crests.football-data.org/${id}.png`;

export const fallbackCompetition: CompetitionInfo = {
  name: "Premier League",
  emblem: "https://crests.football-data.org/PL.png",
  currentSeason: {
    startDate: "2025-08-15",
    endDate: "2026-05-24",
    currentMatchday: 38,
  },
};

export const fallbackStandings: StandingRow[] = [
  { position: 1, team: { id: 64, name: "Liverpool FC", shortName: "Liverpool", tla: "LIV", crest: crest(64) }, playedGames: 38, won: 27, draw: 6, lost: 5, goalsFor: 86, goalsAgainst: 41, goalDifference: 45, points: 87, form: "W,W,D,W,W" },
  { position: 2, team: { id: 57, name: "Arsenal FC", shortName: "Arsenal", tla: "ARS", crest: crest(57) }, playedGames: 38, won: 25, draw: 9, lost: 4, goalsFor: 78, goalsAgainst: 35, goalDifference: 43, points: 84, form: "W,D,W,W,D" },
  { position: 3, team: { id: 65, name: "Manchester City FC", shortName: "Man City", tla: "MCI", crest: crest(65) }, playedGames: 38, won: 24, draw: 8, lost: 6, goalsFor: 82, goalsAgainst: 40, goalDifference: 42, points: 80, form: "W,W,L,W,W" },
  { position: 4, team: { id: 61, name: "Chelsea FC", shortName: "Chelsea", tla: "CHE", crest: crest(61) }, playedGames: 38, won: 21, draw: 10, lost: 7, goalsFor: 68, goalsAgainst: 44, goalDifference: 24, points: 73, form: "D,W,W,D,W" },
  { position: 5, team: { id: 67, name: "Newcastle United FC", shortName: "Newcastle", tla: "NEW", crest: crest(67) }, playedGames: 38, won: 20, draw: 8, lost: 10, goalsFor: 62, goalsAgainst: 48, goalDifference: 14, points: 68, form: "W,L,W,W,D" },
  { position: 6, team: { id: 66, name: "Manchester United FC", shortName: "Man United", tla: "MUN", crest: crest(66) }, playedGames: 38, won: 18, draw: 9, lost: 11, goalsFor: 58, goalsAgainst: 52, goalDifference: 6, points: 63, form: "L,W,D,W,L" },
  { position: 7, team: { id: 73, name: "Tottenham Hotspur FC", shortName: "Spurs", tla: "TOT", crest: crest(73) }, playedGames: 38, won: 17, draw: 10, lost: 11, goalsFor: 65, goalsAgainst: 55, goalDifference: 10, points: 61, form: "D,D,W,L,W" },
  { position: 8, team: { id: 58, name: "Aston Villa FC", shortName: "Aston Villa", tla: "AVL", crest: crest(58) }, playedGames: 38, won: 16, draw: 11, lost: 11, goalsFor: 55, goalsAgainst: 50, goalDifference: 5, points: 59, form: "W,D,L,W,D" },
  { position: 9, team: { id: 563, name: "Brighton & Hove Albion FC", shortName: "Brighton", tla: "BHA", crest: crest(397) }, playedGames: 38, won: 15, draw: 10, lost: 13, goalsFor: 54, goalsAgainst: 52, goalDifference: 2, points: 55, form: "L,W,D,L,W" },
  { position: 10, team: { id: 402, name: "AFC Bournemouth", shortName: "Bournemouth", tla: "BOU", crest: crest(1044) }, playedGames: 38, won: 14, draw: 12, lost: 12, goalsFor: 50, goalsAgainst: 49, goalDifference: 1, points: 54, form: "D,W,L,D,W" },
  { position: 11, team: { id: 354, name: "Crystal Palace FC", shortName: "Crystal Palace", tla: "CRY", crest: crest(354) }, playedGames: 38, won: 13, draw: 12, lost: 13, goalsFor: 48, goalsAgainst: 50, goalDifference: -2, points: 51, form: "W,L,D,W,L" },
  { position: 12, team: { id: 76, name: "Wolverhampton Wanderers FC", shortName: "Wolves", tla: "WOL", crest: crest(76) }, playedGames: 38, won: 13, draw: 10, lost: 15, goalsFor: 45, goalsAgainst: 52, goalDifference: -7, points: 49, form: "L,D,W,L,D" },
  { position: 13, team: { id: 341, name: "Nottingham Forest FC", shortName: "Nott'm Forest", tla: "NFO", crest: crest(351) }, playedGames: 38, won: 12, draw: 11, lost: 15, goalsFor: 42, goalsAgainst: 48, goalDifference: -6, points: 47, form: "D,L,W,D,L" },
  { position: 14, team: { id: 63, name: "Fulham FC", shortName: "Fulham", tla: "FUL", crest: crest(63) }, playedGames: 38, won: 12, draw: 10, lost: 16, goalsFor: 44, goalsAgainst: 54, goalDifference: -10, points: 46, form: "L,W,L,D,W" },
  { position: 15, team: { id: 328, name: "Burnley FC", shortName: "Burnley", tla: "BUR", crest: crest(328) }, playedGames: 38, won: 11, draw: 9, lost: 18, goalsFor: 38, goalsAgainst: 58, goalDifference: -20, points: 42, form: "L,L,W,D,L" },
  { position: 16, team: { id: 62, name: "Everton FC", shortName: "Everton", tla: "EVE", crest: crest(62) }, playedGames: 38, won: 10, draw: 12, lost: 16, goalsFor: 36, goalsAgainst: 50, goalDifference: -14, points: 42, form: "D,L,D,W,L" },
  { position: 17, team: { id: 397, name: "West Ham United FC", shortName: "West Ham", tla: "WHU", crest: crest(563) }, playedGames: 38, won: 10, draw: 10, lost: 18, goalsFor: 40, goalsAgainst: 58, goalDifference: -18, points: 40, form: "L,D,L,W,L" },
  { position: 18, team: { id: 351, name: "Leeds United FC", shortName: "Leeds", tla: "LEE", crest: crest(341) }, playedGames: 38, won: 9, draw: 11, lost: 18, goalsFor: 38, goalsAgainst: 60, goalDifference: -22, points: 38, form: "L,L,D,L,W" },
  { position: 19, team: { id: 1044, name: "AFC Bournemouth", shortName: "Bournemouth", tla: "BOU", crest: crest(1044) }, playedGames: 38, won: 8, draw: 10, lost: 20, goalsFor: 35, goalsAgainst: 62, goalDifference: -27, points: 34, form: "L,L,L,D,L" },
  { position: 20, team: { id: 71, name: "Sunderland AFC", shortName: "Sunderland", tla: "SUN", crest: crest(71) }, playedGames: 38, won: 6, draw: 8, lost: 24, goalsFor: 28, goalsAgainst: 68, goalDifference: -40, points: 26, form: "L,L,L,L,D" },
];

export const fallbackScorers: Scorer[] = [
  { player: { id: 1, name: "Mohamed Salah", nationality: "Egypt", position: "Forward" }, team: fallbackStandings[0].team, goals: 29, assists: 18, penalties: 5 },
  { player: { id: 2, name: "Erling Haaland", nationality: "Norway", position: "Forward" }, team: fallbackStandings[2].team, goals: 27, assists: 5, penalties: 4 },
  { player: { id: 3, name: "Alexander Isak", nationality: "Sweden", position: "Forward" }, team: fallbackStandings[4].team, goals: 23, assists: 6, penalties: 2 },
  { player: { id: 4, name: "Cole Palmer", nationality: "England", position: "Midfielder" }, team: fallbackStandings[3].team, goals: 15, assists: 12, penalties: 6 },
  { player: { id: 5, name: "Bryan Mbeumo", nationality: "Cameroon", position: "Forward" }, team: fallbackStandings[11].team, goals: 14, assists: 7, penalties: 1 },
];

function makeMatch(
  id: number,
  home: StandingRow["team"],
  away: StandingRow["team"],
  homeScore: number | null,
  awayScore: number | null,
  status: string,
  daysOffset: number
): Match {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return {
    id,
    utcDate: date.toISOString(),
    status,
    matchday: 38,
    stage: "REGULAR_SEASON",
    homeTeam: home,
    awayTeam: away,
    score: {
      winner:
        homeScore !== null && awayScore !== null
          ? homeScore > awayScore
            ? "HOME_TEAM"
            : awayScore > homeScore
              ? "AWAY_TEAM"
              : "DRAW"
          : null,
      fullTime: { home: homeScore, away: awayScore },
      halfTime: {
        home: homeScore !== null ? Math.floor(homeScore * 0.6) : null,
        away: awayScore !== null ? Math.floor(awayScore * 0.5) : null,
      },
    },
  };
}

export const fallbackFixtures: Match[] = [
  makeMatch(1001, fallbackStandings[0].team, fallbackStandings[1].team, null, null, "TIMED", 2),
  makeMatch(1002, fallbackStandings[2].team, fallbackStandings[3].team, null, null, "TIMED", 3),
  makeMatch(1003, fallbackStandings[4].team, fallbackStandings[5].team, null, null, "TIMED", 4),
  makeMatch(1004, fallbackStandings[6].team, fallbackStandings[7].team, null, null, "TIMED", 5),
  makeMatch(1005, fallbackStandings[8].team, fallbackStandings[9].team, null, null, "TIMED", 6),
];

export const fallbackResults: Match[] = [
  makeMatch(901, fallbackStandings[0].team, fallbackStandings[2].team, 3, 1, "FINISHED", -1),
  makeMatch(902, fallbackStandings[1].team, fallbackStandings[3].team, 2, 2, "FINISHED", -2),
  makeMatch(903, fallbackStandings[4].team, fallbackStandings[6].team, 1, 0, "FINISHED", -3),
  makeMatch(904, fallbackStandings[5].team, fallbackStandings[7].team, 0, 2, "FINISHED", -4),
  makeMatch(905, fallbackStandings[8].team, fallbackStandings[10].team, 4, 1, "FINISHED", -5),
];
