export interface Team {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
  venue?: string;
}

export interface StandingRow {
  position: number;
  team: Team;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: string | null;
}

export interface Match {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  stage: string;
  competition?: string;
  homeTeam: Team;
  awayTeam: Team;
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
}

export interface Scorer {
  player: {
    id: number;
    name: string;
    nationality: string;
    position: string;
  };
  team: Team;
  goals: number;
  assists: number | null;
  penalties: number | null;
}

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  /** Longer publisher-provided excerpt used on the article page. */
  content?: string;
  link: string;
  pubDate: string;
  source: string;
  image?: string;
  /** Direct file URL or YouTube / Vimeo / Dailymotion watch URL */
  videoUrl?: string;
}

export interface CompetitionInfo {
  name: string;
  emblem: string;
  currentSeason: {
    startDate: string;
    endDate: string;
    currentMatchday: number | null;
  };
}
