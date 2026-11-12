import Link from "next/link";

const links = [
  { href: "/kenya-football", label: "News" },
  { href: "/kenya-football/teams", label: "Teams" },
  { href: "/kenya-football/fixtures", label: "Fixtures" },
  { href: "/kenya-football/results", label: "Results" },
];

export function KenyaFootballNav() {
  return (
    <nav aria-label="Kenyan football" className="kenya-subnav border-b">
      <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="kenya-subnav__link shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition">
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
