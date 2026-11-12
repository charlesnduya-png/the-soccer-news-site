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
        <strong key={index} className="coach-bolt-strong font-semibold">
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
        <p key={index} className="pl-1 text-[14px] leading-7">
          {renderInline(trimmed)}
        </p>
      );
      return;
    }

    blocks.push(
      <p key={index} className="text-[14px] leading-7">
        {renderInline(trimmed)}
      </p>
    );
  });

  return blocks.length ? blocks : <p className="text-[14px] leading-7">{content}</p>;
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
    <div className="coach-bolt-intel rounded-xl border p-3 text-xs">
      <p className="coach-bolt-intel__label font-semibold">
        {intel.lineupLabel ?? "Match Intelligence"}
      </p>
      <p className="coach-bolt-intel__title mt-1 text-sm font-medium">
        {intel.team1} vs {intel.team2}
      </p>
      <p className="coach-bolt-intel__meta">
        {[intel.league, intel.status, intel.score].filter(Boolean).join(" · ")}
      </p>
      {intel.kickoff && (
        <p className="coach-bolt-intel__meta mt-1">Kickoff: {formatKickoff(intel.kickoff)}</p>
      )}
      {hasLineup && (
        <div className="mt-2 space-y-1">
          <p>
            <span className="coach-bolt-intel__meta">{intel.homeLineup?.teamName}</span>{" "}
            {intel.homeLineup?.formation ? `(${intel.homeLineup.formation})` : ""}
          </p>
          <p className="coach-bolt-intel__body">
            {intel.homeLineup?.starters
              .slice(0, 6)
              .map((p) => p.name)
              .join(", ")}
            {(intel.homeLineup?.starters.length ?? 0) > 6 ? "…" : ""}
          </p>
          <p>
            <span className="coach-bolt-intel__meta">{intel.awayLineup?.teamName}</span>{" "}
            {intel.awayLineup?.formation ? `(${intel.awayLineup.formation})` : ""}
          </p>
          <p className="coach-bolt-intel__body">
            {intel.awayLineup?.starters
              .slice(0, 6)
              .map((p) => p.name)
              .join(", ")}
            {(intel.awayLineup?.starters.length ?? 0) > 6 ? "…" : ""}
          </p>
        </div>
      )}
      {intel.xg && (
        <p className="coach-bolt-intel__body mt-2">
          xG: {intel.team1} {intel.xg.home} — {intel.team2} {intel.xg.away}
        </p>
      )}
      <p className="coach-bolt-intel__sources mt-2 text-[10px] uppercase tracking-wide">
        Sources: {intel.sources.join(" + ")}
      </p>
    </div>
  );
}

export function FootballAssistant() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [docked, setDocked] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
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
  const mobileIntroDoneRef = useRef(false);

  const greeting = coachBoltGreeting();
  const activeProvider = providers.find((p) => p.name === provider);
  const showLauncher = !open && (!isMobile || !docked);
  const showPeek = !open && isMobile && docked;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const sync = () => {
      const mobile = media.matches;
      setIsMobile(mobile);
      if (!mobile) {
        setDocked(false);
        mobileIntroDoneRef.current = false;
      }
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 600);
    return () => window.clearTimeout(timer);
  }, []);

  // On phones: one short pop-in, then tuck to a tiny peek tab.
  useEffect(() => {
    if (!isMobile || !visible || open) return;

    if (mobileIntroDoneRef.current) {
      setDocked(true);
      return;
    }

    setDocked(false);
    const timer = window.setTimeout(() => {
      mobileIntroDoneRef.current = true;
      setDocked(true);
    }, 4200);

    return () => window.clearTimeout(timer);
  }, [isMobile, visible, open]);

  useEffect(() => {
    if (!visible || open || docked) return;

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
      } else if (!isMobile) {
        pauseTimer = window.setTimeout(() => {
          index = 0;
          setText("");
          setTyping(true);
          typeTimer = window.setTimeout(typeNext, TYPE_MS);
        }, PAUSE_MS);
      } else {
        setTyping(false);
      }
    };

    typeTimer = window.setTimeout(typeNext, TYPE_MS);

    return () => {
      if (typeTimer) window.clearTimeout(typeTimer);
      if (pauseTimer) window.clearTimeout(pauseTimer);
    };
  }, [visible, open, docked, greeting, isMobile]);

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
      if (next) {
        setDocked(false);
        if (messages.length === 0) {
          setMessages([
            {
              role: "assistant",
              content:
                "Hey! Good to see you. I'm Coach Bolt — talk to me like a mate who knows football. Ask about a match, lineups, predictions, or just say hi.",
            },
          ]);
        }
      } else if (isMobile) {
        setDocked(true);
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
    <>
      {open ? (
        <button
          type="button"
          className="coach-bolt-backdrop pointer-events-auto fixed inset-0 z-40"
          aria-label="Close Coach Bolt overlay"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={`football-assistant pointer-events-none fixed bottom-3 right-3 z-50 flex flex-col items-end gap-2 transition-all duration-500 sm:bottom-5 sm:right-5 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        } ${open ? "football-assistant--open inset-x-3 bottom-3 top-auto sm:inset-auto sm:bottom-5 sm:right-5" : ""} ${
          showPeek ? "football-assistant--docked" : ""
        }`}
        aria-label="Coach Bolt football assistant"
      >
        {open && (
          <div
            className="coach-bolt-panel pointer-events-auto flex h-[min(78vh,40rem)] w-full max-w-[min(100%,26rem)] flex-col overflow-hidden rounded-2xl border shadow-[0_24px_64px_rgba(0,0,0,0.28)] sm:w-[26rem]"
            role="dialog"
            aria-modal="true"
            aria-label="Coach Bolt chat"
          >
            <header className="coach-bolt-panel__header shrink-0 border-b px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Image
                    src="/football-assistant.png"
                    alt=""
                    width={48}
                    height={48}
                    className="h-11 w-11 shrink-0 object-contain"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="coach-bolt-panel__eyebrow text-xs font-semibold uppercase tracking-[0.16em]">
                      Coach Bolt
                    </p>
                    <p className="coach-bolt-panel__subtitle truncate text-sm">
                      Friendly football tips · lineups · scores
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={resetChat}
                    className="coach-bolt-panel__ghost rounded-lg px-2.5 py-1.5 text-xs font-medium"
                  >
                    New chat
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="coach-bolt-panel__ghost rounded-lg px-2.5 py-1.5 text-lg leading-none"
                    aria-label="Close Coach Bolt"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="relative mt-3">
                <button
                  type="button"
                  onClick={() => setProviderOpen((v) => !v)}
                  className="coach-bolt-panel__select flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs"
                >
                  <span>{activeProvider?.label ?? "Coach AI (Chat)"}</span>
                  <span aria-hidden>{providerOpen ? "▴" : "▾"}</span>
                </button>
                {providerOpen && (
                  <div className="coach-bolt-panel__menu absolute left-0 right-0 z-10 mt-1 overflow-hidden rounded-xl border shadow-lg">
                    {providers.map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        disabled={!item.available}
                        onClick={() => {
                          setProvider(item.name);
                          setProviderOpen(false);
                        }}
                        className={`coach-bolt-panel__menu-item block w-full px-3 py-2.5 text-left text-xs disabled:opacity-40 ${
                          provider === item.name ? "is-active" : ""
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </header>

            {(liveFixtures.length > 0 || upcoming.length > 0) && (
              <div className="coach-bolt-panel__rails shrink-0 space-y-2 border-b px-3 py-2.5">
                {liveFixtures.length > 0 && (
                  <div>
                    <p className="coach-bolt-panel__rail-label mb-1.5 text-[10px] font-semibold uppercase tracking-wide">
                      Live now
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-0.5">
                      {liveFixtures.slice(0, 5).map((fixture, index) => (
                        <button
                          key={`${fixture.home}-${fixture.away}-${index}`}
                          type="button"
                          onClick={() =>
                            void sendMessage(
                              `What do you think about ${fixture.home} and ${fixture.away}?`
                            )
                          }
                          className="coach-bolt-chip shrink-0 rounded-lg border px-2.5 py-1.5 text-left text-[11px]"
                        >
                          {fixture.home} vs {fixture.away}
                          {fixture.score ? ` · ${fixture.score}` : ""}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {upcoming.length > 0 && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <p className="coach-bolt-panel__rail-label text-[10px] font-semibold uppercase tracking-wide">
                        Upcoming
                      </p>
                      <button
                        type="button"
                        onClick={() => void loadUpcoming()}
                        className="coach-bolt-panel__ghost text-[10px]"
                      >
                        Refresh
                      </button>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-0.5">
                      {upcoming.slice(0, 6).map((match) => (
                        <button
                          key={match.matchId}
                          type="button"
                          onClick={() =>
                            void sendMessage(
                              `What do you think about ${match.home} and ${match.away}?`
                            )
                          }
                          className="coach-bolt-chip min-w-[8.5rem] shrink-0 rounded-lg border px-2.5 py-2 text-left"
                        >
                          <p className="coach-bolt-chip__title text-[11px] font-medium">
                            {match.home}
                          </p>
                          <p className="coach-bolt-chip__meta text-[11px]">vs {match.away}</p>
                          <p className="coach-bolt-chip__meta mt-1 text-[10px]">
                            {formatKickoff(match.kickoff)}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="coach-bolt-messages min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
              {messages.map((entry, index) => (
                <div
                  key={`${entry.role}-${index}`}
                  className={
                    entry.role === "user"
                      ? "coach-bolt-msg coach-bolt-msg--user ml-6 rounded-2xl rounded-br-md px-3.5 py-2.5 text-right text-[14px] leading-7"
                      : "coach-bolt-msg coach-bolt-msg--bot mr-2 rounded-2xl rounded-bl-md border px-3.5 py-2.5"
                  }
                >
                  {entry.role === "assistant"
                    ? renderAssistantContent(entry.content)
                    : entry.content}
                </div>
              ))}

              {matchIntel && !loading && <MatchIntelPanel intel={matchIntel} />}

              {loading && (
                <div className="coach-bolt-msg coach-bolt-msg--bot mr-2 rounded-2xl rounded-bl-md border px-3.5 py-3">
                  <p className="coach-bolt-panel__eyebrow text-[12px]">
                    {ANALYSIS_STEPS[analysisStep]}
                  </p>
                  <div className="mt-2 flex items-center gap-1">
                    <span className="coach-bolt-dot h-1.5 w-1.5 rounded-full" />
                    <span className="coach-bolt-dot coach-bolt-dot--2 h-1.5 w-1.5 rounded-full" />
                    <span className="coach-bolt-dot coach-bolt-dot--3 h-1.5 w-1.5 rounded-full" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="coach-bolt-panel__suggestions flex shrink-0 flex-wrap gap-1.5 border-t px-3 py-2.5">
              {COACH_BOLT_SUGGESTIONS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={loading}
                  onClick={() => void sendMessage(prompt)}
                  className="coach-bolt-suggestion rounded-full border px-3 py-1.5 text-[11px] transition disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <form
              onSubmit={handleSubmit}
              className="coach-bolt-panel__composer flex shrink-0 gap-2 border-t p-3"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about a match, team or score…"
                disabled={loading}
                className="coach-bolt-input min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm outline-none"
                aria-label="Message Coach Bolt"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="coach-bolt-send rounded-xl px-3.5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45"
              >
                Send
              </button>
            </form>
          </div>
        )}

        {showLauncher ? (
          <>
            <button
              type="button"
              onClick={toggleOpen}
              className="football-assistant__bubble pointer-events-auto relative min-h-[3.25rem] max-w-[13rem] rounded-2xl border px-4 py-3 text-left text-sm font-medium leading-snug shadow-[0_12px_40px_rgba(0,0,0,0.25)] backdrop-blur-md transition sm:max-w-[15rem] sm:text-[15px]"
              aria-label={`Open Coach Bolt — ${greeting}`}
            >
              <span className="football-assistant__dot absolute -bottom-2 right-8 h-4 w-4 rotate-45 border-b border-r" />
              <span aria-hidden="true">
                {text}
                <span
                  className={`football-assistant__cursor ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[2px] ${
                    typing ? "opacity-100" : "opacity-70"
                  }`}
                />
              </span>
            </button>

            <button
              type="button"
              onClick={toggleOpen}
              className="football-assistant__robot pointer-events-auto relative h-24 w-24 cursor-pointer sm:h-28 sm:w-28"
              aria-label="Open Coach Bolt"
            >
              <div className="football-assistant__glow absolute inset-0 rounded-full blur-2xl" />
              <Image
                src="/football-assistant.png"
                alt="Coach Bolt robot assistant"
                width={256}
                height={256}
                className="relative h-full w-full object-contain drop-shadow-[0_12px_28px_rgba(0,255,135,0.25)]"
                priority={false}
              />
            </button>
          </>
        ) : null}

        {showPeek ? (
          <button
            type="button"
            onClick={toggleOpen}
            className="football-assistant__peek pointer-events-auto"
            aria-label="Open Coach Bolt"
            title="Coach Bolt"
          >
            <Image
              src="/football-assistant.png"
              alt=""
              width={64}
              height={64}
              className="football-assistant__peek-img h-full w-full object-contain"
              aria-hidden
            />
            <span className="football-assistant__peek-dot" aria-hidden="true" />
          </button>
        ) : null}
      </aside>
    </>
  );
}
