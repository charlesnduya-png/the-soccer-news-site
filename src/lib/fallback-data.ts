import type { CompetitionInfo, Match, Scorer, StandingRow } from "./types";

const crest = (id: number) =>
  `https://images.fotmob.com/image_resources/logo/teamlogo/${id}.png`;

export const fallbackCompetition: CompetitionInfo = {
  name: "Premier League",
  emblem: "https://crests.football-data.org/PL.png",
  currentSeason: {
    startDate: "2026-08-14",
    endDate: "2027-05-23",
    currentMatchday: 3,
  },
};

/** Last-resort 2026/27 table snapshot — live data comes from FotMob / football-data.org. */
export const fallbackStandings: StandingRow[] = [
  { position: 1, team: { id: 8456, name: "Manchester City", shortName: "Man City", tla: "MCI", crest: crest(8456) }, playedGames: 3, won: 3, draw: 0, lost: 0, goalsFor: 7, goalsAgainst: 2, goalDifference: 5, points: 9, form: "W,W,W" },
  { position: 2, team: { id: 9825, name: "Arsenal", shortName: "Arsenal", tla: "ARS", crest: crest(9825) }, playedGames: 3, won: 3, draw: 0, lost: 0, goalsFor: 6, goalsAgainst: 1, goalDifference: 5, points: 9, form: "W,W,W" },
  { position: 3, team: { id: 8667, name: "Hull City", shortName: "Hull", tla: "HUL", crest: crest(8667) }, playedGames: 3, won: 2, draw: 1, lost: 0, goalsFor: 3, goalsAgainst: 0, goalDifference: 3, points: 7, form: "W,W,D" },
  { position: 4, team: { id: 8455, name: "Chelsea", shortName: "Chelsea", tla: "CHE", crest: crest(8455) }, playedGames: 3, won: 2, draw: 0, lost: 1, goalsFor: 8, goalsAgainst: 7, goalDifference: 1, points: 6, form: "W,W,L" },
  { position: 5, team: { id: 9937, name: "Brentford", shortName: "Brentford", tla: "BRE", crest: crest(9937) }, playedGames: 3, won: 1, draw: 2, lost: 0, goalsFor: 5, goalsAgainst: 2, goalDifference: 3, points: 5, form: "D,W,D" },
  { position: 6, team: { id: 8650, name: "Liverpool", shortName: "Liverpool", tla: "LIV", crest: crest(8650) }, playedGames: 3, won: 1, draw: 2, lost: 0, goalsFor: 6, goalsAgainst: 4, goalDifference: 2, points: 5, form: "W,D,D" },
  { position: 7, team: { id: 10261, name: "Newcastle United", shortName: "Newcastle", tla: "NEW", crest: crest(10261) }, playedGames: 3, won: 1, draw: 2, lost: 0, goalsFor: 6, goalsAgainst: 4, goalDifference: 2, points: 5, form: "W,D,D" },
  { position: 8, team: { id: 8668, name: "Everton", shortName: "Everton", tla: "EVE", crest: crest(8668) }, playedGames: 3, won: 1, draw: 2, lost: 0, goalsFor: 5, goalsAgainst: 3, goalDifference: 2, points: 5, form: "D,W,D" },
  { position: 9, team: { id: 8463, name: "Leeds United", shortName: "Leeds", tla: "LEE", crest: crest(8463) }, playedGames: 3, won: 1, draw: 2, lost: 0, goalsFor: 3, goalsAgainst: 2, goalDifference: 1, points: 5, form: "D,W,D" },
  { position: 10, team: { id: 10204, name: "Brighton & Hove Albion", shortName: "Brighton", tla: "BHA", crest: crest(10204) }, playedGames: 3, won: 1, draw: 1, lost: 1, goalsFor: 8, goalsAgainst: 5, goalDifference: 3, points: 4, form: "L,W,D" },
  { position: 11, team: { id: 10260, name: "Manchester United", shortName: "Man United", tla: "MUN", crest: crest(10260) }, playedGames: 3, won: 1, draw: 1, lost: 1, goalsFor: 7, goalsAgainst: 6, goalDifference: 1, points: 4, form: "W,L,D" },
  { position: 12, team: { id: 8472, name: "Sunderland", shortName: "Sunderland", tla: "SUN", crest: crest(8472) }, playedGames: 3, won: 1, draw: 1, lost: 1, goalsFor: 3, goalsAgainst: 3, goalDifference: 0, points: 4, form: "W,L,D" },
  { position: 13, team: { id: 9826, name: "Crystal Palace", shortName: "Crystal Palace", tla: "CRY", crest: crest(9826) }, playedGames: 3, won: 1, draw: 0, lost: 2, goalsFor: 4, goalsAgainst: 8, goalDifference: -4, points: 3, form: "L,L,W" },
  { position: 14, team: { id: 9902, name: "Ipswich Town", shortName: "Ipswich", tla: "IPS", crest: crest(9902) }, playedGames: 3, won: 1, draw: 0, lost: 2, goalsFor: 4, goalsAgainst: 8, goalDifference: -4, points: 3, form: "L,L,W" },
  { position: 15, team: { id: 8678, name: "AFC Bournemouth", shortName: "Bournemouth", tla: "BOU", crest: crest(8678) }, playedGames: 3, won: 0, draw: 2, lost: 1, goalsFor: 4, goalsAgainst: 5, goalDifference: -1, points: 2, form: "D,L,D" },
  { position: 16, team: { id: 10203, name: "Nottingham Forest", shortName: "Nott'm Forest", tla: "NFO", crest: crest(10203) }, playedGames: 3, won: 0, draw: 2, lost: 1, goalsFor: 2, goalsAgainst: 3, goalDifference: -1, points: 2, form: "D,L,D" },
  { position: 17, team: { id: 10252, name: "Aston Villa", shortName: "Aston Villa", tla: "AVL", crest: crest(10252) }, playedGames: 3, won: 0, draw: 1, lost: 2, goalsFor: 0, goalsAgainst: 5, goalDifference: -5, points: 1, form: "L,L,D" },
  { position: 18, team: { id: 8586, name: "Tottenham Hotspur", shortName: "Tottenham", tla: "TOT", crest: crest(8586) }, playedGames: 3, won: 0, draw: 1, lost: 2, goalsFor: 0, goalsAgainst: 5, goalDifference: -5, points: 1, form: "L,L,D" },
  { position: 19, team: { id: 9879, name: "Fulham", shortName: "Fulham", tla: "FUL", crest: crest(9879) }, playedGames: 3, won: 0, draw: 0, lost: 3, goalsFor: 4, goalsAgainst: 7, goalDifference: -3, points: 0, form: "L,L,L" },
  { position: 20, team: { id: 8669, name: "Coventry City", shortName: "Coventry", tla: "COV", crest: crest(8669) }, playedGames: 3, won: 0, draw: 0, lost: 3, goalsFor: 0, goalsAgainst: 5, goalDifference: -5, points: 0, form: "L,L,L" },
];

export const fallbackScorers: Scorer[] = [
  { player: { id: 1, name: "Erling Haaland", nationality: "Norway", position: "Forward" }, team: fallbackStandings[0].team, goals: 5, assists: 1, penalties: 1 },
  { player: { id: 2, name: "Bukayo Saka", nationality: "England", position: "Forward" }, team: fallbackStandings[1].team, goals: 3, assists: 2, penalties: 0 },
  { player: { id: 3, name: "Cole Palmer", nationality: "England", position: "Midfielder" }, team: fallbackStandings[3].team, goals: 3, assists: 1, penalties: 1 },
  { player: { id: 4, name: "Mohamed Salah", nationality: "Egypt", position: "Forward" }, team: fallbackStandings[5].team, goals: 2, assists: 2, penalties: 0 },
  { player: { id: 5, name: "Bryan Mbeumo", nationality: "Cameroon", position: "Forward" }, team: fallbackStandings[4].team, goals: 2, assists: 1, penalties: 0 },
];

function makeMatch(
  id: number,
  home: StandingRow["team"],
  away: StandingRow["team"],
  homeScore: number | null,
  awayScore: number | null,
  status: string,
  dayOffset: number
): Match {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(15, 0, 0, 0);

  return {
    id,
    utcDate: date.toISOString(),
    status,
    matchday: 4,
    stage: "REGULAR_SEASON",
    competition: "Premier League",
    homeTeam: home,
    awayTeam: away,
    score: {
      winner:
        homeScore === null || awayScore === null
          ? null
          : homeScore > awayScore
            ? "HOME_TEAM"
            : awayScore > homeScore
              ? "AWAY_TEAM"
              : "DRAW",
      fullTime: { home: homeScore, away: awayScore },
      halfTime: { home: null, away: null },
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
  makeMatch(901, fallbackStandings[0].team, fallbackStandings[18].team, 3, 1, "FINISHED", -1),
  makeMatch(902, fallbackStandings[1].team, fallbackStandings[19].team, 2, 0, "FINISHED", -2),
  makeMatch(903, fallbackStandings[3].team, fallbackStandings[17].team, 2, 1, "FINISHED", -3),
  makeMatch(904, fallbackStandings[5].team, fallbackStandings[10].team, 2, 2, "FINISHED", -4),
  makeMatch(905, fallbackStandings[2].team, fallbackStandings[15].team, 1, 0, "FINISHED", -5),
];
