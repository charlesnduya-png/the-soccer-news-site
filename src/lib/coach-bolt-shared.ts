import type { MatchIntelligence } from "@/lib/coach-bolt-engine/match-types";
import type { AIProvider } from "@/lib/coach-bolt-engine/types";

export type CoachBoltMessage = {
  role: "user" | "assistant";
  content: string;
};

export type CoachBoltProvider = {
  name: AIProvider;
  label: string;
  available: boolean;
};

export type UpcomingMatchCard = {
  matchId: string;
  home: string;
  away: string;
  league: string;
  kickoff: string;
  homeFormation?: string;
  awayFormation?: string;
  lineupLabel?: string;
};

export type LiveFixtureCard = {
  home: string;
  away: string;
  league?: string;
  score?: string;
  status?: string;
};

export const COACH_BOLT_SUGGESTIONS = [
  "Hey!",
  "How are you?",
  "What do you think about Arsenal and Chelsea?",
  "Who's the best midfielder right now?",
];

export function coachBoltGreeting() {
  return "Ask me anything about football";
}

export type { MatchIntelligence };
