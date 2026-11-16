"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { href: "/admin", label: "Growth" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/posts/new", label: "New post" },
];

export function AdminShell({
  children,
  configured,
}: {
  children: ReactNode;
  configured: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/admin/login";

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="admin-portal min-h-screen bg-[#06050d] text-white">
      <div className="admin-portal__glow pointer-events-none fixed inset-0" aria-hidden />
      <header className="relative z-[1] border-b border-white/10 bg-[#0a0914]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00ff87]/85">
              soccer.co.ke
            </p>
            <h1 className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide text-white">
              Admin portal
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-white/70 transition hover:border-[#00ff87]/40 hover:text-[#00ff87]"
            >
              View site
            </Link>
            {configured && !isLogin ? (
              <button
                type="button"
                onClick={() => void logout()}
                className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-white/70 transition hover:border-red-400/40 hover:text-red-300"
              >
                Sign out
              </button>
            ) : null}
          </div>
        </div>
        {!isLogin ? (
          <nav
            aria-label="Admin"
            className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6 lg:px-8"
          >
            {NAV.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname === item.href ||
                    (item.href !== "/admin/posts/new" &&
                      pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                    active
                      ? "bg-[#00ff87]/15 text-[#00ff87] ring-1 ring-[#00ff87]/40"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </header>
      <div className="relative z-[1] mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
