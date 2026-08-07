"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const CHECK_INTERVAL_MS = 90_000;

/**
 * Keeps the site self-updating in the background:
 * checks pulse and refreshes server-rendered data when stale.
 * News feeds refresh independently through the resilient news API poller.
 * Runs silently with no visible UI.
 */
export function SiteAutopilot() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const statusRes = await fetch("/api/pulse", { cache: "no-store" });
        if (!statusRes.ok) return;

        const status = (await statusRes.json()) as { stale?: boolean };
        if (cancelled) return;

        if (status.stale) {
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
