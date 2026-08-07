import type { VideoEmbed } from "@/lib/news-video";

interface NewsVideoPlayerProps {
  embed: VideoEmbed;
  title: string;
  description: string;
  source: string;
  poster?: string;
}

export function NewsVideoPlayer({
  embed,
  title,
  description,
  source,
  poster,
}: NewsVideoPlayerProps) {
  const platform =
    embed.kind === "file"
      ? "Video"
      : embed.kind.charAt(0).toUpperCase() + embed.kind.slice(1);
  const watchUrl =
    embed.kind === "youtube"
      ? `https://www.youtube.com/watch?v=${embed.id}`
      : embed.kind === "vimeo"
        ? `https://vimeo.com/${embed.id}`
        : embed.kind === "dailymotion"
          ? `https://www.dailymotion.com/video/${embed.id}`
          : undefined;

  if (embed.kind === "file") {
    return (
      <VideoShell
        platform={platform}
        title={title}
        description={description}
        source={source}
        watchUrl={watchUrl}
      >
          <video
            className="aspect-video w-full"
            controls
            playsInline
            preload="metadata"
            poster={poster}
            title={title}
          >
            <source src={embed.src} />
            Your browser does not support embedded video.
          </video>
      </VideoShell>
    );
  }

  return (
    <VideoShell
      platform={platform}
      title={title}
      description={description}
      source={source}
      watchUrl={watchUrl}
    >
      <div className="aspect-video w-full bg-black">
        <iframe
          src={embed.src}
          title={title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="origin-when-cross-origin"
        />
      </div>
    </VideoShell>
  );
}

function VideoShell({
  platform,
  title,
  description,
  source,
  watchUrl,
  children,
}: {
  platform: string;
  title: string;
  description: string;
  source: string;
  watchUrl?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="relative mt-8 overflow-hidden rounded-3xl border border-white/10 bg-[#0b0812] shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-gradient-to-r from-[#171022] to-[#0b0812] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">
            Featured video
          </span>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
          {platform}
        </span>
      </div>

      <div className="relative">
        {children}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#00ff87]/70 to-transparent"
          aria-hidden
        />
      </div>

      <figcaption className="p-5 sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#00ff87]">
          {source}
        </p>
        <h2 className="mt-2 text-xl font-bold leading-snug text-white sm:text-2xl">
          {title}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60 sm:text-base sm:leading-7">
          {description}
        </p>
        {watchUrl ? (
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white transition hover:border-[#00ff87]/50 hover:bg-[#00ff87]/10 hover:text-[#00ff87]"
          >
            Open on {platform}
            <span aria-hidden>↗</span>
          </a>
        ) : null}
      </figcaption>
    </figure>
  );
}
