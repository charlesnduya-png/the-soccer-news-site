import Link from "next/link";

const links = [
  { href: "/kenya-football", label: "News" },
  { href: "/kenya-football/teams", label: "Teams" },
  { href: "/kenya-football/fixtures", label: "Fixtures" },
  { href: "/kenya-football/results", label: "Results" },
];

export function KenyaFootballNav() {
  return (
    <nav
      aria-label="Kenyan football"
      className="border-b border-white/10 bg-[#09070f]"
    >
      <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-[#00ff87]/40 hover:bg-[#00ff87]/10 hover:text-[#00ff87]"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
