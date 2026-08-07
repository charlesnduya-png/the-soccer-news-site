import Link from "next/link";
import type { ReactNode } from "react";

const linkIcons: Record<string, ReactNode> = {
  Matches: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6.5 10h7M10 6.5v7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  Table: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M4 5h12M4 10h12M4 15h8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  Statistics: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M5 14V9M10 14V6M15 14v-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  News: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <rect x="4" y="4" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 8h6M7 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Kenya: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M10 3.5 12.2 8l4.8.7-3.5 3.4.8 4.8L10 14.8 5.7 16.9l.8-4.8L3 8.7l4.8-.7L10 3.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Transfers: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M7 6h8M7 10h8M7 14h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="m4 6 1.5 1.5L4 9M4 10l1.5 1.5L4 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Clubs: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <circle cx="7" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="13" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4.5 15c.8-1.8 2.4-3 5.5-3s4.7 1.2 5.5 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
};

export type HomeQuickLink = {
  href: string;
  label: string;
};

export function HomeQuickNav({ links }: { links: HomeQuickLink[] }) {
  return (
    <nav className="home-quick-nav home-fade-up home-fade-up--5" aria-label="Quick links">
      {links.map((link) => {
        const isNews = link.label === "News";
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`home-quick-nav__link ${isNews ? "home-quick-nav__link--news" : ""}`}
          >
            <span className="home-quick-nav__icon">{linkIcons[link.label]}</span>
            {isNews ? (
              <>
                <span className="home-chip--news__dot" aria-hidden="true" />
                {link.label}
              </>
            ) : (
              link.label
            )}
          </Link>
        );
      })}
    </nav>
  );
}
