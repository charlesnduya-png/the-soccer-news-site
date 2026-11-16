"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!configured) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Login failed.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!configured) {
    return (
      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-6 text-amber-100">
        <p className="font-semibold">Admin password not set</p>
        <p className="mt-2 text-sm text-amber-100/80">
          Add <code className="text-[#00ff87]">ADMIN_PASSWORD</code> (and ideally{" "}
          <code className="text-[#00ff87]">ADMIN_SESSION_SECRET</code>) to your
          environment, then redeploy.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
          Password
        </span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none ring-[#00ff87]/0 transition focus:border-[#00ff87]/50 focus:ring-2 focus:ring-[#00ff87]/25"
          placeholder="Enter admin password"
          required
        />
      </label>
      {error ? (
        <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-[#00ff87] px-4 py-3 text-sm font-bold text-[#07060f] transition hover:bg-[#7dffb8] disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Enter portal"}
      </button>
    </form>
  );
}
