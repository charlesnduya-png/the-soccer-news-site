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
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="shopify-stat-card">
      <p className="shopify-stat-card__label">{label}</p>
      <p className={`shopify-stat-card__value ${accent ? "shopify-stat-card__value--accent" : ""}`}>
        {value}
      </p>
      {hint ? <p className="shopify-stat-card__hint">{hint}</p> : null}
    </div>
  );
}

function ViewsChart({ series }: { series: GrowthSnapshot["series"] }) {
  const max = Math.max(1, ...series.map((point) => point.views));
  return (
    <div className="shopify-panel">
      <div className="shopify-panel__head">
        <div>
          <p className="shopify-panel__eyebrow">Traffic</p>
          <h2 className="shopify-panel__title">Sessions over time</h2>
        </div>
        <p className="shopify-panel__meta">Last 14 days · page views</p>
      </div>
      <div className="shopify-chart">
        {series.map((point) => {
          const height = Math.max(6, Math.round((point.views / max) * 100));
          return (
            <div key={point.date} className="shopify-chart__col" title={`${point.date}: ${point.views}`}>
              <div className="shopify-chart__bar-wrap">
                <div className="shopify-chart__bar" style={{ height: `${height}%` }} />
              </div>
              <span className="shopify-chart__label">{point.date.slice(8)}</span>
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
      <div className="shopify-analytics animate-pulse space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-white/70" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-white/70" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="shopify-analytics">
        <div className="shopify-panel shopify-panel--error">
          {error || "No growth data yet."}
        </div>
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
    <div className="shopify-analytics space-y-5">
      <section className="shopify-analytics__intro">
        <p className="shopify-panel__eyebrow">Analytics</p>
        <h2 className="shopify-analytics__heading">Site growth</h2>
        <p className="shopify-analytics__sub">
          Shopify-style traffic overview for soccer.co.ke — live page views,
          top pages, and audience mix.
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today" value={formatNumber(growth.today)} hint="Page views" accent />
        <StatCard label="Last 7 days" value={formatNumber(growth.last7Days)} />
        <StatCard label="Last 30 days" value={formatNumber(growth.last30Days)} />
        <StatCard
          label="Total views"
          value={formatNumber(growth.totalViews)}
          hint={`${growth.publishedPosts} live posts · ${growth.draftPosts} drafts`}
        />
      </div>

      <ViewsChart series={growth.series} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="shopify-panel">
          <div className="shopify-panel__head">
            <h3 className="shopify-panel__title">Top pages</h3>
          </div>
          <table className="shopify-table">
            <thead>
              <tr>
                <th>Page</th>
                <th>Views</th>
              </tr>
            </thead>
            <tbody>
              {growth.topPages.length === 0 ? (
                <tr>
                  <td colSpan={2} className="shopify-table__empty">
                    No page views recorded yet.
                  </td>
                </tr>
              ) : (
                growth.topPages.map((page) => (
                  <tr key={page.path}>
                    <td>{page.path}</td>
                    <td>{formatNumber(page.views)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="shopify-panel">
          <div className="shopify-panel__head">
            <h3 className="shopify-panel__title">Referrers</h3>
          </div>
          <table className="shopify-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Views</th>
              </tr>
            </thead>
            <tbody>
              {growth.topReferrers.length === 0 ? (
                <tr>
                  <td colSpan={2} className="shopify-table__empty">
                    Waiting for referral traffic.
                  </td>
                </tr>
              ) : (
                growth.topReferrers.map((row) => (
                  <tr key={row.source}>
                    <td>{row.source}</td>
                    <td>{formatNumber(row.views)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="shopify-panel">
          <div className="shopify-panel__head">
            <h3 className="shopify-panel__title">Devices</h3>
          </div>
          <div className="shopify-device-grid">
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
                <div key={label} className="shopify-device">
                  <p className="shopify-device__label">{label}</p>
                  <p className="shopify-device__value">{formatNumber(value)}</p>
                  <div className="shopify-device__track">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <p className="shopify-device__pct">{pct}%</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="shopify-panel">
          <div className="shopify-panel__head">
            <h3 className="shopify-panel__title">Live hub pulse</h3>
            <span
              className={`shopify-pill ${pulse.ok ? "shopify-pill--ok" : "shopify-pill--bad"}`}
            >
              {pulse.ok ? "Healthy" : "Degraded"}
            </span>
          </div>
          <div className="shopify-device-grid">
            <div className="shopify-device">
              <p className="shopify-device__label">News</p>
              <p className="shopify-device__value">{formatNumber(pulse.newsCount)}</p>
            </div>
            <div className="shopify-device">
              <p className="shopify-device__label">Live matches</p>
              <p className="shopify-device__value">
                {formatNumber(pulse.liveMatchCount)}
              </p>
            </div>
            <div className="shopify-device">
              <p className="shopify-device__label">Transfers</p>
              <p className="shopify-device__value">
                {formatNumber(pulse.transferCount)}
              </p>
            </div>
            <div className="shopify-device">
              <p className="shopify-device__label">Fixtures</p>
              <p className="shopify-device__value">
                {formatNumber(pulse.fixtureCount)}
              </p>
            </div>
          </div>
          <p className="shopify-panel__footnote">
            Pulse age {pulse.ageSeconds}s · next warm in {pulse.nextWarmInSeconds}s
          </p>
        </div>
      </div>
    </div>
  );
}
