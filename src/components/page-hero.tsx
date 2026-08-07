interface PageHeroProps {
  title: string;
  subtitle?: string;
  badge?: string;
}

export function PageHero({ title, subtitle, badge }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#140a22] via-[#0b0814] to-[#05040c]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,255,135,0.15),transparent_50%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {badge && (
          <span className="mb-4 inline-block rounded-full bg-[#00ff87]/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#00ff87]">
            {badge}
          </span>
        )}
        <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 max-w-2xl text-lg text-white/60">{subtitle}</p>
        )}
      </div>
    </section>
  );
}
