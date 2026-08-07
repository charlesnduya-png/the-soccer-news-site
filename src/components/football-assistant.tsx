"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  COACH_BOLT_SUGGESTIONS,
  coachBoltGreeting,
  type CoachBoltMessage,
  type CoachBoltProvider,
  type LiveFixtureCard,
  type MatchIntelligence,
  type UpcomingMatchCard,
} from "@/lib/coach-bolt-shared";

const API_BASE = "/api/coach-bolt";
const TYPE_MS = 45;
const PAUSE_MS = 2800;

const ANALYSIS_STEPS = [
  "Querying FotMob for predicted lineups…",
  "Pulling live match data from LiveGoals…",
  "Generating match intelligence report…",
];


function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-[#00ff87]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function renderAssistantContent(content: string) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.includes("━━━")) return;
    if (trimmed.startsWith("|")) return;

    if (trimmed.startsWith("• ")) {
      blocks.push(
        <p key={index} className="pl-1 text-[13px] leading-relaxed">
          {renderInline(trimmed)}
        </p>
      );
      return;
    }

    blocks.push(
      <p key={index} className="text-[13px] leading-relaxed">
        {renderInline(trimmed)}
      </p>
    );
  });

  return blocks.length ? blocks : <p className="text-[13px] leading-relaxed">{content}</p>;
}

function formatKickoff(iso?: string) {
  if (!iso) return "TBC";
  try {
    const d = new Date(iso);
    const now = new Date();
    const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    if (d.toDateString() === now.toDateString()) return `Today ${time}`;
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "TBC";
  }
}

function MatchIntelPanel({ intel }: { intel: MatchIntelligence }) {
  const hasLineup = (intel.homeLineup?.starters.length ?? 0) > 0;

  return (
    <div className="rounded-xl border border-[#00ff87]/20 bg-[#0f172a] p-3 text-xs text-white/85">
      <p className="font-semibold text-[#00ff87]">
        {intel.lineupLabel ?? "Match Intelligence"}
      </p>
      <p className="mt-1 text-sm font-medium text-white">
        {intel.team1} vs {intel.team2}
      </p>
      <p className="text-white/55">
        {[intel.league, intel.status, intel.score].filter(Boolean).join(" · ")}
      </p>
      {intel.kickoff && (
        <p className="mt-1 text-white/55">Kickoff: {formatKickoff(intel.kickoff)}</p>
      )}
      {hasLineup && (
        <div className="mt-2 space-y-1">
          <p>
            <span className="text-white/60">{intel.homeLineup?.teamName}</span>{" "}
            {intel.homeLineup?.formation ? `(${intel.homeLineup.formation})` : ""}
          </p>
          <p className="text-white/75">
            {intel.homeLineup?.starters
              .slice(0, 6)
              .map((p) => p.name)
              .join(", ")}
            {(intel.homeLineup?.starters.length ?? 0) > 6 ? "…" : ""}
          </p>
          <p>
            <span className="text-white/60">{intel.awayLineup?.teamName}</span>{" "}
            {intel.awayLineup?.formation ? `(${intel.awayLineup.formation})` : ""}
          </p>
          <p className="text-white/75">
            {intel.awayLineup?.starters
              .slice(0, 6)
              .map((p) => p.name)
              .join(", ")}
            {(intel.awayLineup?.starters.length ?? 0) > 6 ? "…" : ""}
          </p>
        </div>
      )}
      {intel.xg && (
        <p className="mt-2 text-white/70">
          xG: {intel.team1} {intel.xg.home} — {intel.team2} {intel.xg.away}
        </p>
      )}
      <p className="mt-2 text-[10px] uppercase tracking-wide text-white/40">
        Sources: {intel.sources.join(" + ")}
      </p>
    </div>
  );
}

export function FootballAssistant() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(true);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<CoachBoltMessage[]>([]);
  const [matchIntel, setMatchIntel] = useState<MatchIntelligence | null>(null);
  const [providers, setProviders] = useState<CoachBoltProvider[]>([]);
  const [provider, setProvider] = useState("fallback");
  const [providerOpen, setProviderOpen] = useState(false);
  const [upcoming, setUpcoming] = useState<UpcomingMatchCard[]>([]);
  const [liveFixtures, setLiveFixtures] = useState<LiveFixtureCard[]>([]);
  const [analysisStep, setAnalysisStep] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const analysisTimerRef = useRef<number | undefined>(undefined);

  const greeting = coachBoltGreeting();
  const activeProvider = providers.find((p) => p.name === provider);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 600);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible || open) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) {
      setText(greeting);
      setTyping(false);
      return;
    }

    let index = 0;
    let pauseTimer: number | undefined;
    let typeTimer: number | undefined;

    const typeNext = () => {
      index += 1;
      setText(greeting.slice(0, index));
      setTyping(index < greeting.length);

      if (index < greeting.length) {
        typeTimer = window.setTimeout(typeNext, TYPE_MS);
      } else {
        pauseTimer = window.setTimeout(() => {
          index = 0;
          setText("");
          setTyping(true);
          typeTimer = window.setTimeout(typeNext, TYPE_MS);
        }, PAUSE_MS);
      }
    };

    typeTimer = window.setTimeout(typeNext, TYPE_MS);

    return () => {
      if (typeTimer) window.clearTimeout(typeTimer);
      if (pauseTimer) window.clearTimeout(pauseTimer);
    };
  }, [visible, open, greeting]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open, matchIntel]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const loadProviders = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/chat`);
      const data = (await res.json()) as { providers?: CoachBoltProvider[] };
      const list = data.providers ?? [{ name: "fallback", label: "Coach AI (Chat)", available: true }];
      setProviders(list);
      const preferred = list.find((p) => p.available && p.name !== "fallback");
      if (preferred) setProvider(preferred.name);
    } catch {
      setProviders([{ name: "fallback", label: "Coach AI (Chat)", available: true }]);
    }
  }, []);

  const loadUpcoming = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/upcoming`);
      const data = (await res.json()) as { matches?: UpcomingMatchCard[] };
      setUpcoming(data.matches ?? []);
    } catch {
      setUpcoming([]);
    }
  }, []);

  const loadLive = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/live`);
      const data = (await res.json()) as { fixtures?: LiveFixtureCard[] };
      setLiveFixtures(data.fixtures ?? []);
    } catch {
      setLiveFixtures([]);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadProviders();
    void loadUpcoming();
    void loadLive();
  }, [open, loadProviders, loadUpcoming, loadLive]);

  const startAnalysis = () => {
    window.clearInterval(analysisTimerRef.current);
    setAnalysisStep(0);
    analysisTimerRef.current = window.setInterval(() => {
      setAnalysisStep((step) => (step + 1) % ANALYSIS_STEPS.length);
    }, 1400);
  };

  const stopAnalysis = () => {
    window.clearInterval(analysisTimerRef.current);
    analysisTimerRef.current = undefined;
  };

  const sendMessage = useCallback(
    async (raw: string) => {
      const message = raw.trim();
      if (!message || loading) return;

      const userMessage: CoachBoltMessage = { role: "user", content: message };
      const nextHistory = [...messages, userMessage];
      setMessages(nextHistory);
      setInput("");
      setLoading(true);
      setMatchIntel(null);

      const isMatchQuery = /\b(vs|versus|against|and)\b/i.test(message);
      if (isMatchQuery) startAnalysis();

      try {
        const res = await fetch(`${API_BASE}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: nextHistory, provider }),
        });

        const data = (await res.json()) as {
          content?: string;
          error?: string;
          matchIntelligence?: MatchIntelligence | null;
        };

        if (data.error) throw new Error(data.error);

        if (data.matchIntelligence) setMatchIntel(data.matchIntelligence);

        setMessages([
          ...nextHistory,
          {
            role: "assistant",
            content:
              typeof data.content === "string"
                ? data.content
                : "Coach Bolt hit a snag. Try again in a moment.",
          },
        ]);
      } catch {
        setMessages([
          ...nextHistory,
          {
            role: "assistant",
            content:
              "I encountered an issue processing that request. Please try again in a moment.",
          },
        ]);
      } finally {
        stopAnalysis();
        setLoading(false);
      }
    },
    [loading, messages, provider]
  );

  const toggleOpen = () => {
    setOpen((current) => {
      const next = !current;
      if (next && messages.length === 0) {
        setMessages([
          {
            role: "assistant",
            content:
              "Hey! Good to see you. I'm Coach Bolt — talk to me like a mate who knows football. Ask about a match, lineups, predictions, or just say hi.",
          },
        ]);
      }
      return next;
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void sendMessage(input);
  };

  const resetChat = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "Fresh chat started. Ask me about any fixture — try “What do you think about Arsenal and Chelsea?”",
      },
    ]);
    setMatchIntel(null);
  };

  return (
    <aside
      className={`football-assistant pointer-events-none fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 transition-all duration-700 sm:bottom-6 sm:right-6 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
      aria-label="Coach Bolt football assistant"
    >
      {open && (
        <div
          className="coach-bolt-panel pointer-events-auto mb-1 flex max-h-[min(86vh,36rem)] w-[min(100vw-2rem,24rem)] flex-col overflow-hidden rounded-2xl border border-[#00ff87]/25 bg-[#0c0814]/98 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-md sm:w-[24rem]"
          role="dialog"
          aria-label="Coach Bolt chat"
        >
          <header className="border-b border-[#00ff87]/15 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#00ff87]">
                  Coach Bolt
                </p>
                <p className="text-[11px] text-white/55">AI predictions · FotMob · LiveGoals</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={resetChat}
                  className="rounded-lg px-2 py-1 text-[11px] text-white/60 hover:bg-white/10 hover:text-white"
                >
                  New
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-2 py-1 text-lg leading-none text-white/60 hover:bg-white/10 hover:text-white"
                  aria-label="Close Coach Bolt"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="relative mt-2">
              <button
                type="button"
                onClick={() => setProviderOpen((v) => !v)}
                className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-[#12101c] px-3 py-1.5 text-left text-[11px] text-white/80"
              >
                <span>{activeProvider?.label ?? "Coach AI (Chat)"}</span>
                <span>{providerOpen ? "▴" : "▾"}</span>
              </button>
              {providerOpen && (
                <div className="absolute left-0 right-0 z-10 mt-1 overflow-hidden rounded-lg border border-white/10 bg-[#12101c] shadow-lg">
                  {providers.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      disabled={!item.available}
                      onClick={() => {
                        setProvider(item.name);
                        setProviderOpen(false);
                      }}
                      className={`block w-full px-3 py-2 text-left text-[11px] ${
                        provider === item.name ? "bg-[#00ff87]/15 text-[#00ff87]" : "text-white/80"
                      } disabled:opacity-40`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </header>

          {liveFixtures.length > 0 && (
            <div className="border-b border-[#00ff87]/10 px-3 py-2">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#00ff87]">
                LiveGoals
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 text-[11px] text-white/75">
                {liveFixtures.slice(0, 6).map((fixture, index) => (
                  <button
                    key={`${fixture.home}-${fixture.away}-${index}`}
                    type="button"
                    onClick={() =>
                      void sendMessage(`What do you think about ${fixture.home} and ${fixture.away}?`)
                    }
                    className="shrink-0 rounded-lg border border-white/10 bg-[#12101c] px-2 py-1 hover:border-[#00ff87]/40"
                  >
                    {fixture.home} vs {fixture.away}
                    {fixture.score ? ` · ${fixture.score}` : ""}
                  </button>
                ))}
              </div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="border-b border-[#00ff87]/10 px-3 py-2">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#00ff87]">
                  Upcoming
                </p>
                <button
                  type="button"
                  onClick={() => void loadUpcoming()}
                  className="text-[10px] text-white/50 hover:text-white"
                >
                  Refresh
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {upcoming.slice(0, 8).map((match) => (
                  <button
                    key={match.matchId}
                    type="button"
                    onClick={() =>
                      void sendMessage(`What do you think about ${match.home} and ${match.away}?`)
                    }
                    className="min-w-[9rem] shrink-0 rounded-lg border border-white/10 bg-[#12101c] px-2 py-2 text-left hover:border-[#00ff87]/40"
                  >
                    <p className="text-[11px] font-medium text-white">{match.home}</p>
                    <p className="text-[11px] text-white/70">vs {match.away}</p>
                    <p className="mt-1 text-[10px] text-white/45">{formatKickoff(match.kickoff)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="coach-bolt-messages min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm leading-relaxed text-white/90">
            {messages.map((entry, index) => (
              <div
                key={`${entry.role}-${index}`}
                className={
                  entry.role === "user"
                    ? "ml-8 rounded-2xl rounded-br-md bg-[#00ff87]/15 px-3 py-2 text-right text-white"
                    : "mr-2 rounded-2xl rounded-bl-md border border-white/8 bg-[#15101f] px-3 py-2"
                }
              >
                {entry.role === "assistant"
                  ? renderAssistantContent(entry.content)
                  : entry.content}
              </div>
            ))}

            {matchIntel && !loading && <MatchIntelPanel intel={matchIntel} />}

            {loading && (
              <div className="mr-2 rounded-2xl rounded-bl-md border border-white/8 bg-[#15101f] px-3 py-3">
                <p className="text-[11px] text-[#00ff87]">{ANALYSIS_STEPS[analysisStep]}</p>
                <div className="mt-2 flex items-center gap-1">
                  <span className="coach-bolt-dot h-1.5 w-1.5 rounded-full bg-[#00ff87]" />
                  <span className="coach-bolt-dot coach-bolt-dot--2 h-1.5 w-1.5 rounded-full bg-[#00ff87]" />
                  <span className="coach-bolt-dot coach-bolt-dot--3 h-1.5 w-1.5 rounded-full bg-[#00ff87]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-[#00ff87]/10 px-3 py-2">
            {COACH_BOLT_SUGGESTIONS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={loading}
                onClick={() => void sendMessage(prompt)}
                className="rounded-full border border-[#00ff87]/20 px-2.5 py-1 text-[11px] text-white/75 transition hover:border-[#00ff87]/50 hover:text-white disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 border-t border-[#00ff87]/15 p-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask Coach Bolt…"
              disabled={loading}
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#12101c] px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#00ff87]/50"
              aria-label="Message Coach Bolt"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl bg-[#00ff87] px-3 py-2 text-sm font-semibold text-[#0c0814] transition hover:bg-[#33ff9f] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {!open && (
        <button
          type="button"
          onClick={toggleOpen}
          className="football-assistant__bubble pointer-events-auto relative min-h-[3.25rem] max-w-[13rem] rounded-2xl border border-[#00ff87]/30 bg-[#0c0814]/95 px-4 py-3 text-left text-sm font-medium leading-snug text-white shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md transition hover:border-[#00ff87]/60 hover:bg-[#12101c] sm:max-w-[15rem] sm:text-[15px]"
          aria-label={`Open Coach Bolt — ${greeting}`}
        >
          <span className="football-assistant__dot absolute -bottom-2 right-8 h-4 w-4 rotate-45 border-b border-r border-[#00ff87]/30 bg-[#0c0814]/95" />
          <span aria-hidden="true">
            {text}
            <span
              className={`football-assistant__cursor ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[2px] bg-[#00ff87] ${
                typing ? "opacity-100" : "opacity-70"
              }`}
            />
          </span>
        </button>
      )}

      <button
        type="button"
        onClick={toggleOpen}
        className="football-assistant__robot pointer-events-auto relative h-28 w-28 cursor-pointer sm:h-32 sm:w-32"
        aria-label={open ? "Close Coach Bolt" : "Open Coach Bolt"}
      >
        <div className="football-assistant__glow absolute inset-0 rounded-full bg-[#00ff87]/10 blur-2xl" />
        <Image
          src="/football-assistant.png"
          alt="Coach Bolt robot assistant"
          width={256}
          height={256}
          className="relative h-full w-full object-contain drop-shadow-[0_12px_28px_rgba(0,255,135,0.25)]"
          priority={false}
        />
      </button>
    </aside>
  );
}
