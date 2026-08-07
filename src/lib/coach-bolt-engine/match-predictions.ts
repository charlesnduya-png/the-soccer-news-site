import type { MatchIntelligence } from "./match-types";

export interface OverUnderPick {
  line: number;
  pick: "OVER" | "UNDER";
  confidence: number;
  probability: number;
}

export interface MatchPrediction {
  homeTeam: string;
  awayTeam: string;
  winner: string;
  predictedScore: { home: number; away: number };
  confidence: number;
  confidenceLabel: "LOW" | "MEDIUM" | "HIGH";
  homeWinPct: number;
  drawPct: number;
  awayWinPct: number;
  xgHome: number;
  xgAway: number;
  totalXg: number;
  overUnder: OverUnderPick[];
  btts: { pick: "YES" | "NO"; confidence: number };
}

const TEAM_STRENGTH: Record<string, number> = {
  "real madrid": 92,
  barcelona: 90,
  "man city": 91,
  "manchester city": 91,
  liverpool: 89,
  arsenal: 88,
  chelsea: 85,
  "man united": 84,
  "manchester united": 84,
  "bayern munich": 90,
  bayern: 90,
  psg: 87,
  "paris saint-germain": 87,
  juventus: 84,
  inter: 86,
  milan: 83,
  "ac milan": 83,
  napoli: 85,
  atletico: 85,
  "atletico madrid": 85,
  dortmund: 84,
  "borussia dortmund": 84,
  tottenham: 83,
  newcastle: 82,
  brighton: 78,
  villa: 80,
  "aston villa": 80,
  brazil: 93,
  argentina: 92,
  france: 91,
  england: 88,
  spain: 89,
  germany: 87,
  portugal: 86,
  italy: 85,
  netherlands: 84,
  belgium: 83,
};

function hashTeams(t1: string, t2: string): number {
  const combined = `${t1.toLowerCase()}-${t2.toLowerCase()}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getTeamStrength(name: string): number {
  const lower = name.toLowerCase().trim();
  if (TEAM_STRENGTH[lower]) return TEAM_STRENGTH[lower];
  for (const [key, val] of Object.entries(TEAM_STRENGTH)) {
    if (lower.includes(key) || key.includes(lower)) return val;
  }
  return 70 + (hashTeams(lower, "") % 20);
}

function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return p;
}

function probUnderLine(totalLambda: number, line: number): number {
  const threshold = Math.floor(line);
  let under = 0;
  for (let g = 0; g <= threshold; g++) {
    under += poissonPmf(g, totalLambda);
  }
  return Math.min(0.98, Math.max(0.02, under));
}

function overUnderPick(totalXg: number, line: number): OverUnderPick {
  const underProb = probUnderLine(totalXg, line);
  const overProb = 1 - underProb;
  const pick = overProb >= underProb ? "OVER" : "UNDER";
  const probability = pick === "OVER" ? overProb : underProb;
  const confidence = Math.round(50 + Math.abs(probability - 0.5) * 100);
  return { line, pick, confidence: Math.min(92, confidence), probability };
}

function estimateXg(strength: number, hash: number): number {
  return 1.2 + (strength - 70) * 0.025 + (hash % 10) * 0.05;
}

function winProbabilities(homeStr: number, awayStr: number) {
  const diff = homeStr + 3 - awayStr;
  let home = 38 + diff * 1.8;
  let away = 32 - diff * 1.8;
  let draw = 30 - Math.abs(diff) * 0.3;
  home = Math.max(8, Math.min(75, home));
  away = Math.max(8, Math.min(75, away));
  draw = Math.max(12, Math.min(40, draw));
  const total = home + draw + away;
  return {
    home: Math.round((home / total) * 100),
    draw: Math.round((draw / total) * 100),
    away: Math.round((away / total) * 100),
  };
}

function confidenceFromDiff(diff: number): {
  pct: number;
  label: "LOW" | "MEDIUM" | "HIGH";
} {
  const abs = Math.abs(diff);
  if (abs < 3) return { pct: 52, label: "MEDIUM" };
  if (abs < 6) return { pct: 64, label: "MEDIUM" };
  if (abs < 10) return { pct: 76, label: "HIGH" };
  return { pct: 86, label: "HIGH" };
}

export function computeMatchPrediction(intel: MatchIntelligence): MatchPrediction {
  const homeTeam = intel.homeLineup?.teamName ?? intel.team1;
  const awayTeam = intel.awayLineup?.teamName ?? intel.team2;
  const hash = hashTeams(homeTeam, awayTeam);

  const sHome = getTeamStrength(homeTeam);
  const sAway = getTeamStrength(awayTeam);
  const diff = sHome + 3 - sAway;
  const conf = confidenceFromDiff(diff);
  const probs = winProbabilities(sHome, sAway);

  let xgHome = intel.xg ? parseFloat(intel.xg.home) : estimateXg(sHome + 3, hash);
  let xgAway = intel.xg ? parseFloat(intel.xg.away) : estimateXg(sAway, hash + 3);
  if (Number.isNaN(xgHome)) xgHome = estimateXg(sHome + 3, hash);
  if (Number.isNaN(xgAway)) xgAway = estimateXg(sAway, hash + 3);

  const totalXg = xgHome + xgAway;

  let scoreHome: number;
  let scoreAway: number;
  let winner: string;

  if (Math.abs(diff) < 3) {
    winner = "Draw";
    scoreHome = 1 + (hash % 2);
    scoreAway = scoreHome;
  } else if (diff > 0) {
    winner = `${homeTeam} Win`;
    scoreHome = 1 + Math.floor(diff / 8) + (hash % 2);
    scoreAway = Math.min(scoreHome - 1, hash % scoreHome);
  } else {
    winner = `${awayTeam} Win`;
    scoreAway = 1 + Math.floor(Math.abs(diff) / 8) + (hash % 2);
    scoreHome = Math.min(scoreAway - 1, hash % scoreAway);
  }

  const overUnder = [1.5, 2.5, 3.5].map((line) => overUnderPick(totalXg, line));

  const bttsProb =
    (1 - poissonPmf(0, xgHome)) * (1 - poissonPmf(0, xgAway));
  const bttsYes = bttsProb >= 0.5;

  return {
    homeTeam,
    awayTeam,
    winner,
    predictedScore: { home: scoreHome, away: scoreAway },
    confidence: conf.pct,
    confidenceLabel: conf.label,
    homeWinPct: probs.home,
    drawPct: probs.draw,
    awayWinPct: probs.away,
    xgHome: Math.round(xgHome * 100) / 100,
    xgAway: Math.round(xgAway * 100) / 100,
    totalXg: Math.round(totalXg * 100) / 100,
    overUnder,
    btts: {
      pick: bttsYes ? "YES" : "NO",
      confidence: Math.round(50 + Math.abs(bttsProb - 0.5) * 100),
    },
  };
}

export function formatOverUnderText(pred: MatchPrediction): string {
  const lines = pred.overUnder.map(
    (o) =>
      `• **${o.line} Goals:** ${o.pick} (${o.confidence}% confidence)`
  );
  return `**OVER / UNDER PREDICTIONS**
${lines.join("\n")}
• **Both Teams To Score:** ${pred.btts.pick} (${pred.btts.confidence}% confidence)
• **Expected Total xG:** ${pred.totalXg.toFixed(2)}`;
}
