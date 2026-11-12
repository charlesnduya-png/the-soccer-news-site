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
    <div className="home-section-header mb-5 flex items-end justify-between gap-3 sm:mb-6 sm:gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="home-section-header__eyebrow mb-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00ff87]/85 sm:mb-2">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="font-[family-name:var(--font-bebas)] text-[1.85rem] leading-none tracking-wide text-white sm:text-4xl">
          {title}
        </h2>
      </div>
      {href ? (
        <Link href={href} className="home-section-header__link group shrink-0">
          <span className="home-section-header__link-label">{linkLabel}</span>
          <span aria-hidden="true" className="transition group-hover:translate-x-0.5">
            →
          </span>
        </Link>
      ) : null}
    </div>
  );
}
