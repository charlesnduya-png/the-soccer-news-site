import Link from "next/link";

interface SectionHeaderProps {
  title: string;
  href?: string;
  linkLabel?: string;
  eyebrow?: string;
}

export function SectionHeader({
  title,
  href,
  linkLabel = "View all",
  eyebrow,
}: SectionHeaderProps) {
  return (
    <div className="home-section-header mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="home-section-header__eyebrow mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00ff87]/85">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="font-[family-name:var(--font-bebas)] text-3xl leading-none tracking-wide text-white sm:text-4xl">
          {title}
        </h2>
      </div>
      {href ? (
        <Link href={href} className="home-section-header__link group shrink-0">
          {linkLabel}
          <span aria-hidden="true" className="transition group-hover:translate-x-0.5">
            →
          </span>
        </Link>
      ) : null}
    </div>
  );
}
