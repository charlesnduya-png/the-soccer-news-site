"use client";

import { useEffect, useState } from "react";

const ROTATING_LEAGUES = [
  "Premier League",
  "La Liga",
  "Bundesliga",
  "Serie A",
  "Ligue 1",
  "Eredivisie",
  "Primeira Liga",
  "Scottish Premiership",
  "Kenyan Football",
];

export function HomeHeroHeadline() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((current) => (current + 1) % ROTATING_LEAGUES.length);
        setVisible(true);
      }, 280);
    }, 3200);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="home-hero-copy">
      <p className="home-fade-up home-hero-kicker mb-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#00ff87]/90">
        <span className="home-hero-live-dot" aria-hidden="true" />
        soccer.co.ke
        <span className="home-hero-kicker__aside text-white/25" aria-hidden="true">
          ·
        </span>
        <span className="home-hero-kicker__aside text-white/50">
          Professional football intelligence
        </span>
      </p>

      <h1 className="home-fade-up home-fade-up--2 home-hero-title font-[family-name:var(--font-bebas)] text-[2.75rem] leading-[0.92] tracking-wide text-white sm:text-6xl lg:text-[4.25rem]">
        <span className="home-hero-shimmer block">EUROPE &amp; BEYOND</span>
        <span className="block text-[#00ff87]">NEWS &amp; SCORES</span>
      </h1>

      <p
        className={`home-hero-league-rotate mt-3 font-[family-name:var(--font-bebas)] text-lg tracking-wide text-white/90 sm:mt-4 sm:text-2xl ${
          visible ? "home-hero-league-rotate--in" : "home-hero-league-rotate--out"
        }`}
        aria-live="polite"
      >
        <span className="text-white/40">Now covering </span>
        <span className="text-[#00ff87]">{ROTATING_LEAGUES[index]}</span>
      </p>

      <p className="home-fade-up home-fade-up--3 home-hero-caption mt-3 max-w-xl text-[15px] font-bold leading-relaxed text-red-500 sm:mt-4 sm:text-base">
        Headlines, live scores, tables and transfers
      </p>

      <ul
        className="home-fade-up home-fade-up--4 home-hero-stats mt-5 hidden flex-wrap gap-2 sm:mt-6 sm:flex"
        aria-label="Site highlights"
      >
        <li className="home-hero-stat">
          <span className="home-hero-stat__value">15</span>
          <span className="home-hero-stat__label">European leagues</span>
        </li>
        <li className="home-hero-stat">
          <span className="home-hero-stat__value">Live</span>
          <span className="home-hero-stat__label">Match centre</span>
        </li>
        <li className="home-hero-stat">
          <span className="home-hero-stat__value">2 min</span>
          <span className="home-hero-stat__label">Auto refresh</span>
        </li>
      </ul>
    </div>
  );
}
