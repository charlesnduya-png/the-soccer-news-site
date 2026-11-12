"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import type { Match } from "@/lib/types";

type LiveScoresResponse = {
  live: Match[];
  fetchedAt?: string;
};

function scoreLabel(match: Match) {
  const home = match.score.fullTime.home;
  const away = match.score.fullTime.away;
  if (home === null || away === null) return "vs";
  return `${home} – ${away}`;
}

function MatchRow({ match }: { match: Match }) {
  return (
    <Link href="/fixtures" className="live-scores-nav__row block px-3 py-2.5 transition">
      <div className="flex items-center justify-between gap-2">
        <span className="live-scores-nav__status is-live text-[10px] font-bold uppercase tracking-wide">
          <span className="live-scores-nav__pulse" aria-hidden />
          LIVE
        </span>
        <span className="live-scores-nav__time text-[10px]">In play</span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <Image
          src={match.homeTeam.crest}
          alt=""
          width={18}
          height={18}
          className="h-[18px] w-[18px] object-contain"
        />
        <span className="live-scores-nav__team min-w-0 flex-1 truncate text-xs font-medium">
          {match.homeTeam.shortName || match.homeTeam.name}
        </span>
        <span className="live-scores-nav__score shrink-0 text-xs font-bold tabular-nums">
          {scoreLabel(match)}
        </span>
        <span className="live-scores-nav__team min-w-0 flex-1 truncate text-right text-xs font-medium">
          {match.awayTeam.shortName || match.awayTeam.name}
        </span>
        <Image
          src={match.awayTeam.crest}
          alt=""
          width={18}
          height={18}
          className="h-[18px] w-[18px] object-contain"
        />
      </div>
    </Link>
  );
}

export function LiveScoresNav({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState<Match[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useLiveRefresh<LiveScoresResponse>({
    url: "/api/live-scores",
    intervalMs: 30_000,
    onData: (data) => {
      setLive(data.live ?? []);
    },
  });

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const liveCount = live.length;
  const isLive = liveCount > 0;

  if (compact) {
    return (
      <Link
        href="/fixtures"
        className={`live-scores-nav__compact relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${isLive ? "is-live" : ""}`}
        aria-label={isLive ? `Live Scores — ${liveCount} live matches` : "Live Scores"}
      >
        <span className={`live-scores-nav__pulse ${isLive ? "is-on" : ""}`} aria-hidden />
        Live Scores
        {isLive ? (
          <span className="live-scores-nav__notify" aria-hidden>
            <svg viewBox="0 0 24 24" className="live-scores-nav__bell" fill="currentColor">
              <path d="M12 22a2.2 2.2 0 0 0 2.2-2.2h-4.4A2.2 2.2 0 0 0 12 22Zm7-6.2V11a7 7 0 1 0-14 0v4.8L3 17.8V19h18v-1.2l-2-1.8Z" />
            </svg>
            <span className="live-scores-nav__badge">{liveCount > 9 ? "9+" : liveCount}</span>
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <div ref={ref} className="live-scores-nav relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={isLive ? `Live Scores — ${liveCount} live matches` : "Live Scores"}
        onClick={() => setOpen((value) => !value)}
        className={`live-scores-nav__trigger relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold transition ${isLive ? "is-live" : ""}`}
      >
        <span className={`live-scores-nav__pulse ${isLive ? "is-on" : ""}`} aria-hidden />
        <span>Live Scores</span>
        {isLive ? (
          <span className="live-scores-nav__notify" aria-hidden>
            <svg viewBox="0 0 24 24" className="live-scores-nav__bell" fill="currentColor">
              <path d="M12 22a2.2 2.2 0 0 0 2.2-2.2h-4.4A2.2 2.2 0 0 0 12 22Zm7-6.2V11a7 7 0 1 0-14 0v4.8L3 17.8V19h18v-1.2l-2-1.8Z" />
            </svg>
            <span className="live-scores-nav__badge">{liveCount > 9 ? "9+" : liveCount}</span>
          </span>
        ) : null}
        <svg
          viewBox="0 0 12 8"
          className={`h-2 w-2 transition ${open ? "rotate-180" : ""}`}
          fill="currentColor"
          aria-hidden
        >
          <path d="M1.4 0.6 6 5.2 10.6.6 12 2 6 8 0 2z" />
        </svg>
      </button>

      {isLive && !open ? (
        <span className="live-scores-nav__goal-pop" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/goal-pop.jpg"
            alt=""
            className="live-scores-nav__goal-pop-img"
            width={68}
            height={27}
            decoding="async"
          />
        </span>
      ) : null}

      {open ? (
        <div role="menu" className="live-scores-nav__menu absolute left-0 top-full z-50 mt-1 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border py-1 shadow-2xl">
          <div className="live-scores-nav__menu-head flex items-center justify-between gap-2 px-3 py-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em]">Live now</p>
            <Link
              href="/fixtures"
              onClick={() => setOpen(false)}
              className="live-scores-nav__all text-[11px] font-semibold"
            >
              Full match centre →
            </Link>
          </div>

          {live.length === 0 ? (
            <p className="live-scores-nav__empty px-3 py-4 text-sm">
              No live matches right now. Check fixtures for kick-offs.
            </p>
          ) : (
            <div className="max-h-[20rem] overflow-y-auto">
              {live.map((match) => (
                <MatchRow key={match.id} match={match} />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
