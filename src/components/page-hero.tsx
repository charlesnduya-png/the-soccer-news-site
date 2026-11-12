interface PageHeroProps {
  title: string;
  subtitle?: string;
  badge?: string;
}

export function PageHero({ title, subtitle, badge }: PageHeroProps) {
  return (
    <section className="page-hero relative overflow-hidden border-b">
      <div className="page-hero__glow absolute inset-0" />
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {badge && (
          <span className="page-hero__badge mb-4 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider">
            {badge}
          </span>
        )}
        <h1 className="page-hero__title text-4xl font-black tracking-tight sm:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="page-hero__subtitle mt-3 max-w-2xl text-lg">{subtitle}</p>
        )}
      </div>
    </section>
  );
}
