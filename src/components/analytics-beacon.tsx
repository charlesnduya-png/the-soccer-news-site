"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function AnalyticsBeacon() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;

    const query = searchParams?.toString();
    const path = query ? `${pathname}?${query}` : pathname;
    const payload = JSON.stringify({
      path,
      referrer: typeof document !== "undefined" ? document.referrer : "",
    });

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/analytics/collect",
          new Blob([payload], { type: "application/json" })
        );
        return;
      }
    } catch {
      // fall through to fetch
    }

    void fetch("/api/analytics/collect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }, [pathname, searchParams]);

  return null;
}
