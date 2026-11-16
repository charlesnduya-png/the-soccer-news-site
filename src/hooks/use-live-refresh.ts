"use client";

import { useEffect, useRef, useState } from "react";

function withCacheBust(url: string): string {
  const join = url.includes("?") ? "&" : "?";
  return `${url}${join}_=${Date.now()}`;
}

/**
 * Polls a URL on an interval and delivers JSON to `onData`.
 * Used by news / transfers so pages stay fresh without a full reload.
 */
export function useLiveRefresh<T>({
  url,
  intervalMs,
  enabled = true,
  immediate = true,
  onData,
}: {
  url: string;
  intervalMs: number;
  enabled?: boolean;
  /** When false, skip the mount fetch and wait for the first interval (SSR already has data). */
  immediate?: boolean;
  onData: (data: T) => void;
}) {
  const onDataRef = useRef(onData);
  onDataRef.current = onData;
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let failureCount = 0;
    let timeoutId: number | undefined;
    let inFlight = false;

    function schedule(delayMs: number) {
      if (cancelled) return;
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        void load();
      }, Math.max(1_000, delayMs));
    }

    async function load() {
      if (cancelled) return;

      // Keep the cadence alive while the tab is hidden; fetch on return via visibility.
      if (document.visibilityState === "hidden") {
        schedule(intervalMs);
        return;
      }

      if (inFlight) {
        schedule(intervalMs);
        return;
      }

      inFlight = true;
      const controller = new AbortController();

      try {
        const res = await fetch(withCacheBust(url), {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as T;
        if (cancelled) return;
        onDataRef.current(data);
        setUpdatedAt(new Date().toISOString());
        setError(null);
        failureCount = 0;
      } catch (err) {
        if (
          !cancelled &&
          !(err instanceof DOMException && err.name === "AbortError")
        ) {
          failureCount += 1;
          setError(err instanceof Error ? err.message : "Refresh failed");
        }
      } finally {
        inFlight = false;
        if (!cancelled) {
          const backoff = Math.min(
            intervalMs * 2 ** failureCount,
            intervalMs * 8
          );
          const jitter = Math.round(backoff * (Math.random() * 0.2 - 0.1));
          schedule(Math.max(10_000, backoff + jitter));
        }
      }
    }

    if (immediate) {
      void load();
    } else {
      schedule(intervalMs);
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        schedule(250);
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [url, intervalMs, enabled, immediate]);

  return { error, updatedAt };
}
