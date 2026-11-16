"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const CHECK_INTERVAL_MS = 90_000;
const MIN_REFRESH_GAP_MS = 60_000;

type PulseStatus = {
  stale?: boolean;
  pulse?: {
    ok?: boolean;
    ageSeconds?: number;
  };
};

/**
 * Keeps the site self-updating in the background:
 * checks pulse (which kicks a server warm when stale) and soft-refreshes
 * server-rendered shells only after a successful warm.
 * News feeds refresh independently through useLiveRefresh — do not stomp them.
 */
export function SiteAutopilot() {
  const router = useRouter();
  const lastRefreshAt = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const statusRes = await fetch("/api/pulse", { cache: "no-store" });
        if (!statusRes.ok) return;

        const status = (await statusRes.json()) as PulseStatus;
        if (cancelled) return;

        // On serverless, in-memory pulse is often empty/stale. Never treat
        // perpetual stale as a reason to router.refresh() every 90s — that
        // overwrites client news polls with ISR props.
        const warmedRecently =
          Boolean(status.pulse?.ok) &&
          typeof status.pulse?.ageSeconds === "number" &&
          status.pulse.ageSeconds < 45;

        if (
          warmedRecently &&
          Date.now() - lastRefreshAt.current > MIN_REFRESH_GAP_MS
        ) {
          lastRefreshAt.current = Date.now();
          router.refresh();
        }
      } catch {
        // Autopilot is best-effort; feeds still self-refresh
      }
    }

    tick();

    const intervalId = window.setInterval(tick, CHECK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return null;
}
