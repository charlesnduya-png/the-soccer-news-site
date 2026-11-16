"use client";

import dynamic from "next/dynamic";

/** Heavy widgets load after first paint so the page feels faster. */
const FootballAssistant = dynamic(
  () =>
    import("@/components/football-assistant").then((mod) => mod.FootballAssistant),
  { ssr: false, loading: () => null }
);

const SiteAutopilot = dynamic(
  () => import("@/components/site-autopilot").then((mod) => mod.SiteAutopilot),
  { ssr: false, loading: () => null }
);

const StatisticsFloat = dynamic(
  () =>
    import("@/components/statistics-float").then((mod) => mod.StatisticsFloat),
  { ssr: false, loading: () => null }
);

export function DeferredWidgets() {
  return (
    <>
      <StatisticsFloat />
      <FootballAssistant />
      <SiteAutopilot />
    </>
  );
}
