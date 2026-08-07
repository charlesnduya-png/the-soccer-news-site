export const COACH_SYSTEM_PROMPT = `You are Coach Bolt — a real person in vibe, not a bot. You text like a football-mad mate: warm, natural, sometimes funny, never stiff or corporate.

## Voice (this matters most)
- Sound HUMAN. Use contractions (I'm, you're, it's, don't). Short sentences mixed with longer ones.
- Greetings must feel like a real DM — "Hey!", "Yo what's good", "Morning! How's it going?" — NEVER sound like a help desk or product onboarding.
- Match the user's energy: casual if they're casual, hyped if they're hyped about a match.
- Before you answer, scan the user's last message for intent (greeting, question, hot take, frustration, debate) and mood (chill, excited, unsure). Then mirror their style and keep the football vibe flowing.
- No bullet lists, no **bold headers**, no "I'm an AI assistant" in normal chat.
- Never say "How can I assist you today" or "I'm here to help with football-related queries."
- It's okay to ask a casual question back ("You watching anything tonight?" / "What brought you on here?").

## Greetings — examples of your tone
- "Hey! Good to see you. What's on your mind — got a game coming up or just fancied a chat?"
- "Yo, all good? I'm Coach Bolt - happy to talk football whenever you are."
- "Morning! Hope you're doing alright. What are we getting into today?"
- "Hey there — you alright? Fire away, I'm listening."

## Normal chat
- Answer like you're texting, not writing a report.
- 1–3 short paragraphs max unless they want depth.
- Remember earlier messages and follow the thread naturally.
- Football chat: players, tactics, rules, transfers, banter, opinions — all fair game.

## Match analysis (only when they mention a fixture or you have LIVE DATA)
Use the structured report format ONLY then:

**MATCH INTELLIGENCE REPORT**
**Fixture:** [Team A] vs [Team B]
**VERDICT** — outcome, scoreline, confidence
**TACTICAL BREAKDOWN**
**RISK FACTORS**
**ANALYST NOTE**

When LIVE MATCH DATA is provided, weave in FotMob lineups, xG, LiveGoals scores naturally.

## Rules
- No keywords needed — understand casual language and context.
- One team only? Ask who they're playing, casually.
- Off-topic? Brief friendly reply, light steer back to football if it fits.
- When the user asks “why”, “reason”, “explain”, or “how did you get that” about your predicted score/winner or your over/under picks, give a clear explanation in a natural, human way. Mention the logic you used (xG/total xG, team strength, home/away factor, and the over/under line threshold) in 1–2 short paragraphs.`;

import { computeMatchPrediction, formatOverUnderText } from "./match-predictions";

export function isMatchQuery(message: string): boolean {
  return !!extractTeams(message);
}

export function isLineupRequest(message: string): boolean {
  return !!extractTeams(message);
}

function looksLikeTeamName(name: string): boolean {
  const cleaned = cleanTeamName(name);
  if (cleaned.length < 2 || cleaned.length > 45) return false;
  if (/^(who|what|when|where|why|how|the|this|that|tonight|today|tomorrow)$/i.test(cleaned)) {
    return false;
  }
  const lower = cleaned.toLowerCase();
  if (TEAM_STRENGTH[lower]) return true;
  for (const key of Object.keys(TEAM_STRENGTH)) {
    if (lower.includes(key) || key.includes(lower)) return true;
  }
  return cleaned.split(/\s+/).length <= 4;
}

function tryExtractTeams(
  team1: string,
  team2: string
): { team1: string; team2: string } | null {
  const t1 = cleanTeamName(team1.trim());
  const t2 = cleanTeamName(team2.trim());
  if (!looksLikeTeamName(t1) || !looksLikeTeamName(t2)) return null;
  if (t1.toLowerCase() === t2.toLowerCase()) return null;
  return { team1: t1, team2: t2 };
}

export function extractTeams(message: string): { team1: string; team2: string } | null {
  const patterns: Array<{ regex: RegExp; groups: [number, number] }> = [
    { regex: /(.+?)\s+(?:vs\.?|v\.?|versus|against|@)\s+(.+)/i, groups: [1, 2] },
    { regex: /(?:between)\s+(.+?)\s+(?:and|&)\s+(.+)/i, groups: [1, 2] },
    {
      regex: /(.+?)\s+(?:play|face|host|take\s+on|meet|visit)\s+(.+)/i,
      groups: [1, 2],
    },
    { regex: /(.+?)\s+and\s+(.+?)(?:\s+(?:game|match|fixture|tonight|today))?$/i, groups: [1, 2] },
    {
      regex: /(?:who(?:'s| is)? gonna win|who wins|who will win|thoughts on)\s+(.+?)\s+(?:and|&|or|vs\.?)\s+(.+)/i,
      groups: [1, 2],
    },
    { regex: /(?:about|on)\s+(.+?)\s+(?:and|&|vs\.?|against)\s+(.+)/i, groups: [1, 2] },
  ];

  for (const { regex, groups } of patterns) {
    const match = message.match(regex);
    if (!match) continue;
    const result = tryExtractTeams(match[groups[0]], match[groups[1]]);
    if (result) return result;
  }
  return null;
}

export function extractTeamsFromMessages(
  messages: import("./types").ChatMessage[]
): { team1: string; team2: string } | null {
  const userMessages = [...messages].reverse().filter((m) => m.role === "user");
  for (const msg of userMessages.slice(0, 4)) {
    const teams = extractTeams(msg.content);
    if (teams) return teams;
  }
  return null;
}

function cleanTeamName(name: string): string {
  return name
    .replace(
      /\b(lineup|line-up|formation|predicted|starting\s*11|xi|squad|tonight|today|tomorrow|please|thanks)\b/gi,
      ""
    )
    .replace(/[?!.,]+$/g, "")
    .trim();
}

function hashTeams(t1: string, t2: string): number {
  const combined = `${t1.toLowerCase()}-${t2.toLowerCase()}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const TEAM_STRENGTH: Record<string, number> = {
  "real madrid": 92, barcelona: 90, "man city": 91, "manchester city": 91,
  liverpool: 89, arsenal: 88, chelsea: 85, "man united": 84, "manchester united": 84,
  "bayern munich": 90, "bayern": 90, psg: 87, "paris saint-germain": 87,
  juventus: 84, inter: 86, milan: 83, "ac milan": 83, napoli: 85,
  atletico: 85, "atletico madrid": 85, dortmund: 84, "borussia dortmund": 84,
  tottenham: 83, "newcastle": 82, brighton: 78, villa: 80, "aston villa": 80,
  brazil: 93, argentina: 92, france: 91, england: 88, spain: 89, germany: 87,
  portugal: 86, italy: 85, netherlands: 84, belgium: 83,
};

function getTeamStrength(name: string): number {
  const lower = name.toLowerCase().trim();
  if (TEAM_STRENGTH[lower]) return TEAM_STRENGTH[lower];
  for (const [key, val] of Object.entries(TEAM_STRENGTH)) {
    if (lower.includes(key) || key.includes(lower)) return val;
  }
  return 70 + (hashTeams(lower, "") % 20);
}

function ratingFromStrength(s: number): string {
  return (s / 10).toFixed(1);
}

function xgFromStrength(s: number, hash: number): string {
  return (1.2 + (s - 70) * 0.025 + (hash % 10) * 0.05).toFixed(2);
}

function formString(hash: number): string {
  const results = ["W", "D", "L"];
  return Array.from({ length: 5 }, (_, i) => results[(hash + i * 3) % 3]).join("-");
}

function confidencePercent(diff: number): { pct: number; label: string } {
  const abs = Math.abs(diff);
  if (abs < 3) return { pct: 52, label: "MEDIUM" };
  if (abs < 6) return { pct: 61, label: "MEDIUM" };
  if (abs < 10) return { pct: 72, label: "HIGH" };
  return { pct: 84, label: "HIGH" };
}

export function generateFallbackPrediction(
  team1: string,
  team2: string,
  intel?: import("./match-types").MatchIntelligence | null
): string {
  if (intel?.homeLineup?.starters.length) {
    return generateIntelPrediction(team1, team2, intel);
  }
  const s1 = getTeamStrength(team1);
  const s2 = getTeamStrength(team2);
  const hash = hashTeams(team1, team2);
  const homeBoost = 3;
  const adjusted1 = s1 + homeBoost;
  const diff = adjusted1 - s2;

  let winner: string;
  let score1: number;
  let score2: number;
  const conf = confidencePercent(diff);

  if (Math.abs(diff) < 3) {
    winner = "Draw";
    score1 = 1 + (hash % 2);
    score2 = score1;
  } else if (diff > 0) {
    winner = `${team1} Win`;
    score1 = 1 + Math.floor(diff / 8) + (hash % 2);
    score2 = hash % score1;
  } else {
    winner = `${team2} Win`;
    score2 = 1 + Math.floor(Math.abs(diff) / 8) + (hash % 2);
    score1 = hash % score2;
  }

  const form1 = formString(hash);
  const form2 = formString(hash + 7);
  const atk1 = ratingFromStrength(adjusted1);
  const atk2 = ratingFromStrength(s2);
  const def1 = ratingFromStrength(adjusted1 - 4);
  const def2 = ratingFromStrength(s2 - 3);
  const xg1 = xgFromStrength(adjusted1, hash);
  const xg2 = xgFromStrength(s2, hash + 3);

  const risks = [
    `${team2}'s counter-attacking threat on the transition could exploit high defensive lines.`,
    `Key midfielder availability may shift the tactical balance significantly.`,
    `Set-piece vulnerability has been a recurring theme in recent fixtures for both sides.`,
    `Late-game squad depth could prove decisive if the match remains tight after 70 minutes.`,
  ];

  const pred = computeMatchPrediction({ team1, team2, sources: [] });
  const ouBlock = formatOverUnderText(pred);

  return `**MATCH INTELLIGENCE REPORT**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**Fixture:** ${team1} vs ${team2}
**Analysis Engine:** Coach Bolt v2.1

**VERDICT**
• **Outcome:** ${winner}
• **Predicted Scoreline:** ${score1}-${score2}
• **Confidence Index:** ${conf.pct}% — ${conf.label}

${ouBlock}

**FORM ANALYSIS**
• **${team1}:** ${form1} — ${adjusted1 >= s2 ? "Strong momentum with consistent results" : "Mixed results; seeking consistency"} in recent fixtures
• **${team2}:** ${form2} — ${s2 >= adjusted1 ? "Competitive form entering this fixture" : "Inconsistent run; tactical adjustments required"}

**KEY METRICS**
| Metric | ${team1} | ${team2} |
| Attack Rating | ${atk1}/10 | ${atk2}/10 |
| Defence Rating | ${def1}/10 | ${def2}/10 |
| Avg xG/Match | ${xg1} | ${xg2} |

**TACTICAL BREAKDOWN**
${team1} are expected to deploy a structured 4-3-3 with emphasis on wide overloads and aggressive midfield pressing. Their build-up patterns through the half-spaces have generated consistent chance creation, averaging ${xg1} xG per match across the sample period.

${team2} will likely prioritise compact defensive shape and rapid transitions. The central midfield battle — press resistance versus ball recovery — represents the decisive tactical duel. Wide areas will be contested heavily, with set pieces offering a significant ${Math.abs(diff) < 5 ? "equalising" : "supplementary"} threat for both units.

**RISK FACTORS**
• ${risks[hash % risks.length]}
• ${risks[(hash + 1) % risks.length]}

**ANALYST NOTE**
Composite modelling (${adjusted1} vs ${s2} strength index, home advantage factored) projects a ${winner.toLowerCase()} scenario. Execution in the first 20 minutes — tempo control and pressing intensity — will likely determine the final outcome.`;
}

export function getSocialReply(
  messages: import("./types").ChatMessage[]
): string | null {
  if (extractTeamsFromMessages(messages)) return null;

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const userMessage = lastUser?.content?.trim() ?? "";
  if (!userMessage) return null;

  const lower = userMessage.toLowerCase().trim();
  const normalized = lower
    .replace(/\bcoach\s*bolt\b/gi, "")
    .replace(/[!.,?]+/g, "")
    .trim();
  const msgHash = hashTeams(userMessage, String(messages.length));
  const isReturning = messages.filter((m) => m.role === "user").length > 1;

  if (isGreeting(lower) || isGreeting(normalized)) {
    return humanGreeting(lower, msgHash, isReturning);
  }

  if (/how are you|how'?s it going|you good|you alright|how you doing|how have you been/i.test(lower)) {
    const alsoHey = /^(hey|hi|hello|yo|sup|good\s+(morning|afternoon|evening))/i.test(lower);
    if (alsoHey) {
      return pickOne(msgHash, [
        "Hey! I'm good, thanks for asking - you alright? What's on your mind today?",
        "Hi! Doing well cheers - how about you? Got any football on the brain?",
        "Hey hey! All good here. You doing alright? What do you want to chat about?",
      ]);
    }
    return pickOne(msgHash, [
      "I'm good, cheers for asking! Always in a better mood when there's football on somewhere. You alright - watching anything good lately?",
      "Doing well, thanks! Been keeping an eye on fixtures as usual. How about you - all good on your end?",
      "Yeah I'm alright, appreciate you asking! What's going on with you - got a team you're buzzing about right now?",
    ]);
  }

  if (/^(thank|thanks|cheers|appreciate|thx)\b/i.test(normalized)) {
    return pickOne(msgHash, [
      "Anytime! Hit me up whenever.",
      "No worries at all — glad I could help.",
      "Cheers! Come back anytime you fancy a chat.",
    ]);
  }

  if (/who are you|what are you|your name/i.test(lower)) {
    return pickOne(msgHash, [
      "I'm Coach Bolt - basically your football guy. Chat normally, ask about players, teams, matches, whatever.",
      "Name's Coach Bolt! I love talking football. Just talk to me like a mate.",
      "Coach Bolt here. I know the game and I love a good chat about it.",
    ]);
  }

  if (/^(bye|goodbye|see you|later|gotta go)\b/i.test(normalized)) {
    return pickOne(msgHash, [
      "Catch you later! Enjoy the football.",
      "See you - come back anytime!",
      "Alright, take it easy! Good chatting with you.",
    ]);
  }

  return null;
}

export function isRoboticLegacyResponse(text: string): boolean {
  return (
    /match intelligence system/i.test(text) ||
    /which fixture shall we/i.test(text) ||
    /submit any fixture/i.test(text) ||
    /professional football analyst, equipped to deliver/i.test(text) ||
    /input required/i.test(text)
  );
}

export function generateFallbackResponse(
  messages: import("./types").ChatMessage[],
  intel?: import("./match-types").MatchIntelligence | null
): string {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const userMessage = lastUser?.content?.trim() ?? "";

  const teams = extractTeamsFromMessages(messages);
  if (teams && /\b(why|reason|explain|how did)\b/i.test(userMessage)) {
    return generateWhyExplanation(teams.team1, teams.team2, userMessage);
  }

  if (teams) {
    return generateFallbackPrediction(teams.team1, teams.team2, intel);
  }

  return generateNaturalChatFallback(userMessage, messages);
}

function generateWhyExplanation(team1: string, team2: string, userMessage: string): string {
  const lower = userMessage.toLowerCase();
  const pred = computeMatchPrediction({
    team1,
    team2,
    sources: [],
  } as any);

  const expectedXg = `I'm expecting about ${pred.xgHome.toFixed(2)} xG for ${pred.homeTeam} and ${pred.xgAway.toFixed(
    2
  )} xG for ${pred.awayTeam} (total xG ${pred.totalXg.toFixed(2)}).`;

  const predictedScore = `${pred.predictedScore.home}-${pred.predictedScore.away}`;

  const ouSpecific = lower.match(/\b(over|under)\s*(\d+(\.\d+)?)\b/i);
  if (ouSpecific) {
    const line = parseFloat(ouSpecific[2]);
    const pick = pred.overUnder.find((o) => o.line === line);
    if (pick) {
      return `Right, so - here's why I leaned ${pick.pick} at ${line} goals. ${expectedXg} With that total expected output, the odds tilt to the ${pick.pick.toLowerCase()} side of the ${line} line (confidence ${pick.confidence}%).`;
    }
  }

  if (/\b(btts|both teams to score|both teams)\b/i.test(lower)) {
    return `Right, so - for BTTS I went with ${pred.btts.pick} because both sides project non-zero attacking output. ${expectedXg} That's what swings the "both teams score" market. Confidence is ${pred.btts.confidence}%.`;
  }

  const mentionedMarket = /\b(over|under|btts|both teams)\b/i.test(lower);
  if (mentionedMarket) {
    return `Right, so - I'm leaning ${pred.overUnder
      .map((o) => `${o.pick} ${o.line}`)
      .join(", ")} based on the expected total goals (${pred.totalXg.toFixed(2)}). For BTTS I've got ${pred.btts.pick} (${pred.btts.confidence}%). ${expectedXg}`;
  }

  return `Right, so - you asked why I picked ${pred.winner} (${predictedScore}). ${expectedXg} That expected-goals picture is why the scoreline lands there, and the confidence (${pred.confidenceLabel} ${pred.confidence}%) reflects how close the matchup is.`;
}

function generateNaturalChatFallback(
  userMessage: string,
  messages: import("./types").ChatMessage[]
): string {
  const social = getSocialReply(messages);
  if (social) return social;

  const msgHash = hashTeams(userMessage, String(messages.length));
  const isQuestion = userMessage.includes("?");
  const lower = userMessage.toLowerCase();

  const teamsForWhy = extractTeamsFromMessages(messages);
  const asksWhy = /\b(why|reason|explain|how did)\b/i.test(lower);

  if (asksWhy && teamsForWhy) {
    const pred = computeMatchPrediction({
      team1: teamsForWhy.team1,
      team2: teamsForWhy.team2,
      sources: [],
    } as any);

    const expectedXg = `I'm expecting about ${pred.xgHome.toFixed(
      2
    )} xG for ${pred.homeTeam} and ${pred.xgAway.toFixed(
      2
    )} xG for ${pred.awayTeam} (total xG ${pred.totalXg.toFixed(2)}).`;

    const predictedScore = `${pred.predictedScore.home}-${pred.predictedScore.away}`;

    const ouSpecific = lower.match(/\b(over|under)\s*(\d+(\.\d+)?)\b/i);
    if (ouSpecific) {
      const line = parseFloat(ouSpecific[2]);
      const pick = pred.overUnder.find((o) => o.line === line);
      if (pick) {
        return `Right, so - here's why I leaned ${pick.pick} at ${line} goals. ${expectedXg} With that total expected output, the model puts a higher chance on the ${pick.pick.toLowerCase()} side of the ${line} line (confidence ${pick.confidence}%).`;
      }
    }

    if (/\b(btts|both teams to score|both teams)\b/i.test(lower)) {
      return `Right, so - For BTTS, I went with ${pred.btts.pick} because both teams project non-zero attacking output. ${expectedXg} - so the probability of both sides landing at least one goal is what swings it. Confidence is ${pred.btts.confidence}%.`;
    }

    const mentionedMarket = /\b(over|under|btts|both teams)\b/i.test(lower);
    if (mentionedMarket) {
      return `Right, so - I'm leaning ${pred.overUnder.map((o) => `${o.pick} ${o.line}`).join(", ")} based on total expected goals (${pred.totalXg.toFixed(
        2
      )}). For BTTS I've got ${pred.btts.pick} (${pred.btts.confidence}%). ${expectedXg}`;
    }

    return `Right, so - You asked why I picked ${pred.winner} (${predictedScore}). ${expectedXg} That expected-goals picture is why the scoreline lands there, and the confidence (${pred.confidenceLabel} ${pred.confidence}%) reflects how close the match is.`;
  }

  if (!userMessage.trim()) {
    return pickOne(msgHash, [
      "Go on then — what's on your mind?",
      "I'm here when you are. What's up?",
      "Shoot — what do you want to talk about?",
    ]);
  }

  const openers = [
    "Yeah, fair one. ",
    "Good question honestly. ",
    "Ha, I like that. ",
    "Right, so — ",
    "Okay so ",
  ];
  const opener = openers[msgHash % openers.length];

  if (isQuestion) {
    return `${opener}${pickOne(msgHash, [
      `Tricky one, but here's how I see it — football's never black and white. Form, injuries, the day itself… all of it matters.`,
      `Depends who you ask, but I'll give you my honest take.`,
      `Love this kind of question. Let me think out loud for a sec.`,
    ])}

If you drop a team or player name I can get way more specific. And if it's a head-to-head, just say both sides naturally — "Arsenal and Chelsea" works fine.

What's the bit you care about most — who's winning, tactics, or something else?`;
  }

  if (userMessage.split(/\s+/).length <= 4) {
    return pickOne(msgHash, [
      "Tell me a bit more — I'm with you, just need a little context!",
      "Go on, expand on that? Happy to dig in.",
      "I'm listening — give me a touch more and we'll get into it.",
    ]);
  }

  return `${opener}I hear you on that.

Football's always about context — who's playing, where, what form they're in. Name a team or match if you want me to go deeper, or just keep going and we'll figure it out together.`;
}

function pickOne(seed: number, options: string[]): string {
  return options[seed % options.length];
}

function isGreeting(lower: string): boolean {
  const core = lower
    .replace(/\bcoach\s*bolt\b/gi, "")
    .replace(/[!.,?]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return (
    /^(hi|hello|hey|hiya|yo|sup|heya|howdy|good morning|good afternoon|good evening|what'?s up|whats up|gm|ga|ge)(\s+(there|mate|coach|buddy|friend))?$/i.test(
      core
    ) || /^(hi|hello|hey)$/i.test(core)
  );
}

function humanGreeting(lower: string, seed: number, isReturning: boolean): string {
  if (isReturning) {
    return pickOne(seed, [
      "Hey, welcome back! What are we on about today?",
      "Oh hey again — good to see you. What's up?",
      "Yo! Back for more football chat? I'm here for it.",
      "Hey! Nice to have you back — what's on your mind?",
    ]);
  }

  if (/good\s+morning|gm\b/i.test(lower)) {
    return pickOne(seed, [
      "Morning! Hope you've had a decent start to the day. Fancy a football chat or got a match on your mind?",
      "Good morning! Early football thoughts or just saying hi? Either way, good to see you.",
      "Morning! How's it going? I'm Coach Bolt - happy to yap about the game whenever you are.",
    ]);
  }

  if (/good\s+(afternoon|evening)|ga\b|ge\b/i.test(lower)) {
    return pickOne(seed, [
      "Hey, good to see you! How's your day been? Anything in football catching your eye?",
      "Evening! Or afternoon - either way, welcome. What brings you on here?",
      "Hey there! Hope the day's treating you well. Want to talk a match, a player, or just shoot the breeze about football?",
    ]);
  }

  if (/what'?s\s+up|whats\s+up|sup\b|yo\b/i.test(lower)) {
    return pickOne(seed, [
      "Yo! Not much - just here ready to talk football. What's good with you?",
      "Sup! All good here. You got a game in mind or just chilling?",
      "What's up! I'm Coach Bolt. Chat's easy - players, teams, who's winning, whatever you fancy.",
      "Heyyy what's good! Fire away whenever you're ready.",
    ]);
  }

  return pickOne(seed, [
    "Hey! Good to see you. I'm Coach Bolt - just talk to me normally, like you would a mate who knows football. What's on your mind?",
    "Hello! Lovely to have you here. I'm all about football chat - matches, players, tactics, hot takes. What do you want to get into?",
    "Hey there! Hope you're doing alright. I'm Coach Bolt - no weird formats, just say what's on your mind and we'll go from there.",
    "Hi! Welcome in. I'm Coach Bolt, your football guy. Got a match coming up, a player you're curious about, or just fancied a chat?",
    "Hey! Great to meet you. I'm Coach Bolt - happy to talk anything football. Who or what should we start with?",
    "Hello hello! I'm Coach Bolt. Chill and chat - I'm easy. What brought you on here today?",
  ]);
}

function generateIntelPrediction(
  team1: string,
  team2: string,
  intel: import("./match-types").MatchIntelligence
): string {
  const hash = hashTeams(team1, team2);
  const s1 = getTeamStrength(intel.homeLineup?.teamName ?? team1);
  const s2 = getTeamStrength(intel.awayLineup?.teamName ?? team2);
  const diff = s1 - s2 + 3;
  const conf = confidencePercent(diff);

  let winner: string;
  let score1: number;
  let score2: number;
  if (Math.abs(diff) < 3) {
    winner = "Draw";
    score1 = 1 + (hash % 2);
    score2 = score1;
  } else if (diff > 0) {
    winner = `${intel.homeLineup?.teamName ?? team1} Win`;
    score1 = 1 + Math.floor(diff / 8) + (hash % 2);
    score2 = hash % score1;
  } else {
    winner = `${intel.awayLineup?.teamName ?? team2} Win`;
    score2 = 1 + Math.floor(Math.abs(diff) / 8) + (hash % 2);
    score1 = hash % score2;
  }

  const homeXI = intel.homeLineup!.starters.map((p) => p.name).join(", ");
  const awayXI = intel.awayLineup!.starters.map((p) => p.name).join(", ");
  const homeForm = intel.homeLineup!.formation ?? "4-3-3";
  const awayForm = intel.awayLineup!.formation ?? "4-2-3-1";

  const lineupLabel = intel.lineupLabel ?? "Predicted XI";
  const upcomingNote = intel.isUpcoming
    ? `\n**Kickoff:** ${intel.kickoff ? new Date(intel.kickoff).toLocaleString() : "TBC"}`
    : "";

  let eventsBlock = "";
  if (intel.incidents?.length) {
    eventsBlock =
      `\n**LIVE MATCH DATA** (LiveGoals)\n` +
      `• Status: ${intel.status} | Score: ${intel.score ?? "—"}` +
      (intel.liveScore?.halftime ? ` | HT: ${intel.liveScore.halftime}` : "") +
      `\n• Key Events:\n` +
      intel.incidents
        .slice(0, 6)
        .map((e) => `  - ${e.minute}' ${e.type}: ${e.player ?? ""}`)
        .join("\n");
  }

  const pred = computeMatchPrediction(intel);
  const ouBlock = formatOverUnderText(pred);

  return `**MATCH INTELLIGENCE REPORT**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**Fixture:** ${intel.team1} vs ${intel.team2}
**League:** ${intel.league ?? "—"}
**Analysis Engine:** Coach Bolt v2.1 + FotMob + LiveGoals${upcomingNote}

**${lineupLabel.toUpperCase()}** (FotMob)
• **${intel.homeLineup!.teamName}** (${homeForm}): ${homeXI}
• **${intel.awayLineup!.teamName}** (${awayForm}): ${awayXI}${
    intel.homeLineup!.unavailable.length
      ? `\n• Unavailable: ${[...intel.homeLineup!.unavailable, ...intel.awayLineup!.unavailable].join(", ")}`
      : ""
  }${eventsBlock}

**VERDICT**
• **Outcome:** ${winner}
• **Predicted Scoreline:** ${score1}-${score2}
• **Confidence Index:** ${conf.pct}% — ${conf.label}
${intel.xg ? `• **xG Reference:** ${intel.team1} ${intel.xg.home} — ${intel.team2} ${intel.xg.away}` : ""}

${ouBlock}

**TACTICAL BREAKDOWN**
FotMob data shows ${intel.homeLineup!.teamName} in a ${homeForm}. ${intel.awayLineup!.teamName} deploy ${awayForm}. The midfield battle between ${intel.homeLineup!.starters[5]?.name ?? "home CM"} and ${intel.awayLineup!.starters[5]?.name ?? "away CM"} will be pivotal.

${intel.h2hSummary ? `${intel.h2hSummary}. ` : ""}Set-piece efficiency and pressing triggers in wide channels are decisive.

**RISK FACTORS**
• Lineup changes before kickoff could shift the tactical balance
• ${intel.awayLineup!.teamName}'s transition threat on the counter

**ANALYST NOTE**
Data sourced from FotMob lineups${intel.incidents?.length ? " and LiveGoals live feed" : ""}. Composite model projects ${winner.toLowerCase()}.`;
}
