"use client";

import { useEffect, useRef, useState } from "react";

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
    let controller: AbortController | null = null;

    async function load() {
      if (document.visibilityState === "hidden" || controller) return;
      controller = new AbortController();

      try {
        const res = await fetch(url, {
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
        if (!cancelled && !(err instanceof DOMException && err.name === "AbortError")) {
          failureCount += 1;
          setError(err instanceof Error ? err.message : "Refresh failed");
        }
      } finally {
        controller = null;
        if (!cancelled) {
          const backoff = Math.min(intervalMs * 2 ** failureCount, intervalMs * 8);
          const jitter = Math.round(backoff * (Math.random() * 0.2 - 0.1));
          timeoutId = window.setTimeout(load, Math.max(10_000, backoff + jitter));
        }
      }
    }

    if (immediate) {
      load();
    } else {
      timeoutId = window.setTimeout(load, intervalMs);
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        if (timeoutId) window.clearTimeout(timeoutId);
        load();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      controller?.abort();
      if (timeoutId) window.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [url, intervalMs, enabled, immediate]);

  return { error, updatedAt };
}
