import Image from "next/image";

/** Bump when replacing the banner asset so browsers fetch the new image. */
const BANNER_VERSION = "20260728d";
const BANNER_SRC = `/banners/janta-player.png?v=${BANNER_VERSION}`;

export function JantaAdvert() {
  return (
    <div className="janta-advert relative mx-auto w-full max-w-[17rem] overflow-hidden rounded-xl border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.3)] sm:max-w-[19rem] lg:ml-auto lg:mr-0 lg:max-w-[21rem]">
      <div className="janta-advert__figure relative">
        <Image
          src={BANNER_SRC}
          alt="Join janta.ke — Kenya's football community"
          width={1200}
          height={675}
          className="janta-advert__image block h-auto w-full"
          sizes="(max-width: 640px) 17rem, 21rem"
          priority
          unoptimized
        />
        <div className="janta-advert__bubble" role="status" aria-live="polite">
          <span className="janta-advert__bubble-emoji" aria-hidden="true">
            ⚽
          </span>
          <span className="janta-advert__bubble-text">
            Join <strong>janta.ke</strong>
          </span>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 border-t border-white/10 bg-[#0a0812]/90 p-2">
        <a
          href="https://janta.ke"
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="janta-advert__cta inline-flex flex-1 items-center justify-center rounded-full bg-[#f5c518] px-2.5 py-1.5 text-[11px] font-bold text-[#0a1630] transition hover:bg-[#ffd84d] sm:text-xs"
        >
          Visit janta.ke
        </a>
        <a
          href="https://chat.whatsapp.com/GtaDYdVWGjJF8u9yJDkyVQ"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center rounded-full border border-white/80 bg-white/15 px-2.5 py-1.5 text-[11px] font-bold text-white backdrop-blur-sm transition hover:bg-white/25 sm:text-xs"
        >
          Join us
        </a>
      </div>
    </div>
  );
}
