"use client";

import { useEffect, useState } from "react";
import type { GrowthSnapshot } from "@/lib/admin-store";
import type { PulseSnapshot } from "@/lib/site-autopilot";

type StatsResponse = {
  growth: GrowthSnapshot;
  pulse: PulseSnapshot;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-KE").format(value);
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="admin-card rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-bebas)] text-4xl tracking-wide text-white">
        {value}
      </p>
      {hint ? <p className="mt-1 text-sm text-white/40">{hint}</p> : null}
    </div>
  );
}

function ViewsChart({ series }: { series: GrowthSnapshot["series"] }) {
  const max = Math.max(1, ...series.map((point) => point.views));
  return (
    <div className="admin-card rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00ff87]/85">
            Traffic
          </p>
          <h2 className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-white">
            Last 14 days
          </h2>
        </div>
        <p className="text-sm text-white/40">Page views</p>
      </div>
      <div className="flex h-48 items-end gap-1.5 sm:gap-2">
        {series.map((point) => {
          const height = Math.max(4, Math.round((point.views / max) * 100));
          const label = point.date.slice(5);
          return (
            <div key={point.date} className="group flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="relative flex h-40 w-full items-end justify-center">
                <div
                  className="w-full max-w-[28px] rounded-t-md bg-gradient-to-t from-[#00ff87]/25 to-[#00ff87] transition group-hover:from-[#00ff87]/40 group-hover:to-[#7dffb8]"
                  style={{ height: `${height}%` }}
                  title={`${point.date}: ${point.views} views`}
                />
              </div>
              <span className="truncate text-[10px] text-white/35">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function GrowthDashboard() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/stats", { cache: "no-store" });
        if (!res.ok) throw new Error("Could not load growth stats.");
        const json = (await res.json()) as StatsResponse;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load stats.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (loading && !data) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/5" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-white/5" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-5 py-8 text-red-200">
        {error || "No growth data yet."}
      </div>
    );
  }

  const { growth, pulse } = data;
  const deviceTotal =
    growth.devices.mobile +
    growth.devices.desktop +
    growth.devices.tablet +
    growth.devices.other;

  return (
    <div className="space-y-6">
      <section>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00ff87]/85">
          Site growth
        </p>
        <h2 className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide text-white sm:text-4xl">
          Audience & reach
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-white/50">
          First-party page views from soccer.co.ke visitors. Numbers grow as
          people browse the live site.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today" value={formatNumber(growth.today)} hint="Page views" />
        <StatCard label="7 days" value={formatNumber(growth.last7Days)} />
        <StatCard label="30 days" value={formatNumber(growth.last30Days)} />
        <StatCard
          label="All time"
          value={formatNumber(growth.totalViews)}
          hint={`${growth.publishedPosts} published · ${growth.draftPosts} drafts`}
        />
      </div>

      <ViewsChart series={growth.series} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="admin-card rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-white">
            Top pages
          </h3>
          <ul className="mt-4 space-y-3">
            {growth.topPages.length === 0 ? (
              <li className="text-sm text-white/40">No page views recorded yet.</li>
            ) : (
              growth.topPages.map((page) => (
                <li
                  key={page.path}
                  className="flex items-center justify-between gap-3 border-b border-white/5 pb-3 text-sm last:border-0"
                >
                  <span className="truncate text-white/80">{page.path}</span>
                  <span className="shrink-0 font-semibold text-[#00ff87]">
                    {formatNumber(page.views)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="admin-card rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-white">
            Top referrers
          </h3>
          <ul className="mt-4 space-y-3">
            {growth.topReferrers.length === 0 ? (
              <li className="text-sm text-white/40">Waiting for referral traffic.</li>
            ) : (
              growth.topReferrers.map((row) => (
                <li
                  key={row.source}
                  className="flex items-center justify-between gap-3 border-b border-white/5 pb-3 text-sm last:border-0"
                >
                  <span className="truncate text-white/80">{row.source}</span>
                  <span className="shrink-0 font-semibold text-[#00ff87]">
                    {formatNumber(row.views)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="admin-card rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-white">
            Devices
          </h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {(
              [
                ["Mobile", growth.devices.mobile],
                ["Desktop", growth.devices.desktop],
                ["Tablet", growth.devices.tablet],
                ["Other", growth.devices.other],
              ] as const
            ).map(([label, value]) => {
              const pct = deviceTotal
                ? Math.round((value / deviceTotal) * 100)
                : 0;
              return (
                <div
                  key={label}
                  className="rounded-xl border border-white/8 bg-black/20 px-3 py-3"
                >
                  <p className="text-xs uppercase tracking-[0.14em] text-white/40">
                    {label}
                  </p>
                  <p className="mt-1 text-xl font-semibold text-white">
                    {formatNumber(value)}
                  </p>
                  <p className="text-xs text-[#00ff87]/80">{pct}%</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="admin-card rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-white">
            Site pulse
          </h3>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-3">
              <dt className="text-white/40">Status</dt>
              <dd className={pulse.ok ? "text-[#00ff87]" : "text-red-300"}>
                {pulse.ok ? "Healthy" : "Degraded"}
              </dd>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-3">
              <dt className="text-white/40">News stories</dt>
              <dd className="text-white">{formatNumber(pulse.newsCount)}</dd>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-3">
              <dt className="text-white/40">Live matches</dt>
              <dd className="text-white">{formatNumber(pulse.liveMatchCount)}</dd>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-3">
              <dt className="text-white/40">Transfers</dt>
              <dd className="text-white">{formatNumber(pulse.transferCount)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-white/35">
            Pulse age {pulse.ageSeconds}s · next warm in {pulse.nextWarmInSeconds}s
          </p>
        </div>
      </div>
    </div>
  );
}
