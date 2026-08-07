export interface PlayerLineup {
  name: string;
  position?: string;
  shirtNumber?: string;
  id?: number;
  layout?: { x: number; y: number };
  imageUrl?: string;
  rating?: number;
}

export interface TeamLineup {
  teamName: string;
  formation?: string;
  starters: PlayerLineup[];
  subs: PlayerLineup[];
  unavailable: string[];
}

export interface MatchIncident {
  type: string;
  minute: number;
  player?: string;
  team?: string;
  detail?: string;
}

export interface MatchIntelligence {
  team1: string;
  team2: string;
  matchId?: string;
  league?: string;
  kickoff?: string;
  status?: string;
  score?: string;
  venue?: string;
  lineupType?: string;
  lineupLabel?: "Predicted XI" | "Confirmed XI" | "Last Starting XI";
  isUpcoming?: boolean;
  homeLineup?: TeamLineup;
  awayLineup?: TeamLineup;
  xg?: { home: string; away: string };
  incidents?: MatchIncident[];
  liveScore?: { home: number; away: number; halftime?: string };
  h2hSummary?: string;
  sources: ("fotmob" | "livegoals")[];
}

export interface UpcomingMatch {
  matchId: string;
  home: string;
  away: string;
  league: string;
  kickoff: string;
  status: string;
  homeFormation?: string;
  awayFormation?: string;
  homeStarters: string[];
  awayStarters: string[];
  lineupLabel: string;
}

export interface LiveFixture {
  id: number;
  name: string;
  home: string;
  away: string;
  status: string;
  score?: string;
  league: string;
  slug: string;
  kickoff?: string;
}
