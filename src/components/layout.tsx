"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { LiveScoresNav } from "@/components/live-scores-nav";
type NavItem =
  | { href: string; label: string; external?: boolean; liveScores?: never }
  | {
      label: string;
      icon?: string;
      liveScores?: boolean;
      children: { href: string; label: string; external?: boolean }[];
    };

const navLinks: NavItem[] = [
  { href: "/fixtures", label: "Matches" },
  { href: "/standings", label: "Table" },
  { href: "/scorers", label: "Statistics" },
  { label: "Live Scores", liveScores: true, children: [] },
  { href: "/news", label: "News" },
  {
    label: "Kenya",
    icon: "/kenya-flag.svg",
    children: [
      { href: "/kenya-football", label: "Kenyan News" },
      { href: "/kenya-football/teams", label: "Kenyan Teams" },
      { href: "/kenya-football/fixtures", label: "Kenyan Fixtures" },
      { href: "/kenya-football/results", label: "Kenyan Results" },
    ],
  },
  { href: "/transfers", label: "Transfers" },
  { href: "/scorers", label: "Players" },
  { href: "/teams", label: "Clubs" },
  { href: "/news", label: "Video" },
  { href: "/fixtures", label: "Watch Live" },
];

/** Lean phone strip — avoid overcrowding the mobile header. */
const mobileNavLinks: NavItem[] = [
  { label: "Live Scores", liveScores: true, children: [] },
  { href: "/fixtures", label: "Matches" },
  { href: "/standings", label: "Table" },
  { href: "/news", label: "News" },
  { href: "/kenya-football", label: "Kenya" },
  { href: "/transfers", label: "Transfers" },
  { href: "/scorers", label: "Stats" },
  { href: "/teams", label: "Clubs" },
];

const footerLinks = [
  { href: "/fixtures", label: "Matches" },
  { href: "/standings", label: "Table" },
  { href: "/news", label: "News" },
  { href: "/kenya-football", label: "Kenya News" },
  { href: "/kenya-football/teams", label: "Kenya Teams" },
  { href: "/kenya-football/fixtures", label: "Kenya Fixtures" },
  { href: "/kenya-football/results", label: "Kenya Results" },
  { href: "/transfers", label: "Transfers" },
  { href: "/teams", label: "Clubs" },
];

function NavAnchor({
  href,
  label,
  external,
  className,
}: {
  href: string;
  label: string;
  external?: boolean;
  className: string;
}) {
  const content =
    label === "News" ? (
      <>
        <span className="nav-news-link__dot" aria-hidden="true" />
        {label}
      </>
    ) : (
      label
    );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

function NavDropdown({
  label,
  icon,
  items,
}: {
  label: string;
  icon?: string;
  items: { href: string; label: string; external?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        {icon ? (
          <Image
            src={icon}
            alt=""
            width={24}
            height={16}
            className="mr-1 h-3.5 w-5 rounded-[2px] object-cover shadow-sm"
            aria-hidden="true"
          />
        ) : null}
        {label}
        <svg
          viewBox="0 0 12 8"
          className={`h-2.5 w-2.5 transition ${open ? "rotate-180" : ""}`}
          fill="currentColor"
          aria-hidden
        >
          <path d="M1.4 0.6 6 5.2 10.6.6 12 2 6 8 0 2z" />
        </svg>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 min-w-[14rem] overflow-hidden rounded-xl border border-white/10 bg-[#120a1c] py-1 shadow-2xl"
        >
          {items.map((child) => (
            <NavAnchor
              key={child.href + child.label}
              href={child.href}
              label={child.label}
              external={child.external}
              className="block px-4 py-2.5 text-sm text-white/75 transition hover:bg-white/10 hover:text-[#00ff87]"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header sticky top-0 z-50 border-b border-white/10 bg-[#07060f]/85 backdrop-blur-xl">
      {/* Logo + theme toggle stay desktop/tablet only — phones use the chip strip */}
      <div className="mx-auto hidden max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:flex sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <Image
            src="/logo.png"
            alt="soccer.co.ke"
            width={48}
            height={48}
            className="h-10 w-10 rounded-full bg-white object-contain shadow-[0_0_20px_rgba(0,0,0,0.25)] sm:h-11 sm:w-11"
            priority
          />
          <div className="hidden sm:block">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-white">
              soccer.co.ke
            </p>
            <p className="text-xs text-white/45">Premier League &amp; Kenya</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <nav
            className="hidden items-center gap-0.5 lg:flex"
            aria-label="Primary"
          >
            {navLinks.map((item) =>
              "liveScores" in item && item.liveScores ? (
                <LiveScoresNav key={item.label} />
              ) : "children" in item ? (
                <NavDropdown
                  key={item.label}
                  label={item.label}
                  icon={item.icon}
                  items={item.children}
                />
              ) : (
                <NavAnchor
                  key={item.label}
                  href={item.href}
                  label={item.label}
                  external={item.external}
                  className={`rounded-full px-3 py-2 text-sm font-medium transition hover:bg-white/10 hover:text-white ${
                    item.label === "Watch Live"
                      ? "font-semibold text-[#00ff87]"
                      : item.label === "News"
                        ? "nav-news-link font-semibold text-[#00ff87]"
                        : "text-white/70"
                  }`}
                />
              )
            )}
          </nav>
        </div>
      </div>

      <nav
        className="site-header__mobile-nav flex gap-2 overflow-x-auto px-4 py-2.5 sm:border-t sm:border-white/5 lg:hidden"
        aria-label="Primary mobile"
      >
        <Link
          href="/"
          className="site-header__mobile-logo shrink-0"
          aria-label="soccer.co.ke home"
        >
          <Image
            src="/logo.png"
            alt=""
            width={32}
            height={32}
            className="site-header__mobile-logo-img"
            priority
          />
        </Link>
        {mobileNavLinks.map((item) =>
          "liveScores" in item && item.liveScores ? (
            <LiveScoresNav key={item.label} compact />
          ) : "href" in item ? (
            <NavAnchor
              key={item.label}
              href={item.href}
              label={item.label}
              external={item.external}
              className={`site-header__mobile-chip shrink-0 ${
                item.label === "News"
                  ? "nav-news-link site-header__mobile-chip--accent"
                  : ""
              }`}
            />
          ) : null
        )}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-[#05040c]/90">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="soccer.co.ke"
            width={48}
            height={48}
            className="h-11 w-11 rounded-full bg-white object-contain"
          />
          <div>
            <p className="font-bold text-white">soccer.co.ke</p>
            <p className="text-sm text-white/50">
              Premier League &amp; Kenyan football news, tables &amp; live scores
            </p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-sm text-white/40">
          <p>Free football hub — news, scores & transfers</p>
          <div className="flex flex-wrap gap-4">
            {footerLinks.map((link) => (
              <Link
                key={link.href + link.label}
                href={link.href}
                className="hover:text-[#00ff87]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
