"use client";

import { useEffect, useState } from "react";

const BANNER_VERSION = "20260820f";

const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/GtaDYdVWGjJF8u9yJDkyVQ";

const SLIDES = [
  {
    src: `/banners/janta-freebet.png?v=${BANNER_VERSION}`,
    alt: "JANTA.ke — get up to 100 KES freebet on registration",
    href: "https://janta.ke",
    cta: "Claim freebet",
  },
  {
    src: `/banners/pilot-ke-aviator.png?v=${BANNER_VERSION}`,
    alt: "PILOT.KE — real-time Aviator statistics and analytics",
    href: "https://www.pilot.ke",
    cta: "Visit Pilot.ke",
  },
  {
    src: `/banners/janta-top-pool.png?v=${BANNER_VERSION}`,
    alt: "JANTA.TOP — Hey! Let's play pool. Free pool information",
    href: "https://www.janta.top",
    cta: "Visit Janta.top",
  },
  {
    src: `/banners/janta-whatsapp-lottery.png?v=${BANNER_VERSION}`,
    alt: "JANTA.KE Online WhatsApp Lottery — real KES prizes",
    href: WHATSAPP_GROUP_URL,
    cta: "Join WhatsApp",
  },
  {
    src: `/banners/janta-play-win.png?v=${BANNER_VERSION}`,
    alt: "JANTA.ke — Play. Win. Get Paid! Welcome bonus up to 100 KES freebet",
    href: "https://janta.ke",
    cta: "Join now",
  },
] as const;

const ROTATE_MS = 5500;

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={direction === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function JantaAdvert() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const activeSlide = SLIDES[index];
  const total = SLIDES.length;

  const goPrev = () => setIndex((current) => (current - 1 + total) % total);
  const goNext = () => setIndex((current) => (current + 1) % total);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  return (
    <div className="relative mx-auto w-full max-w-xl sm:max-w-2xl lg:ml-auto lg:mr-0 lg:max-w-none">
      <div
        className="advert-rail relative"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          className="advert-rail__stage relative w-full overflow-hidden rounded-2xl"
          style={{ aspectRatio: "1024 / 576" }}
        >
          {SLIDES.map((slide, slideIndex) => {
            const active = slideIndex === index;

            return (
              <a
                key={slide.src}
                href={slide.href}
                target={slide.href.startsWith("/") ? undefined : "_blank"}
                rel={
                  slide.href.startsWith("/")
                    ? undefined
                    : "noopener noreferrer sponsored"
                }
                aria-label={slide.alt}
                tabIndex={active ? 0 : -1}
                aria-hidden={!active}
                className="advert-rail__card absolute inset-0 block overflow-hidden rounded-2xl transition-opacity duration-500 ease-out"
                style={{
                  zIndex: active ? 20 : 0,
                  opacity: active ? 1 : 0,
                  pointerEvents: active ? "auto" : "none",
                }}
              >
                {(active ||
                  slideIndex === (index + 1) % total ||
                  slideIndex === (index - 1 + total) % total) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={slide.src}
                    alt={slide.alt}
                    width={1024}
                    height={576}
                    decoding="async"
                    loading={active ? "eager" : "lazy"}
                    fetchPriority={active ? "high" : "low"}
                    className="h-full w-full object-contain"
                  />
                )}
              </a>
            );
          })}

          <button
            type="button"
            aria-label="Previous advert"
            onClick={(event) => {
              event.preventDefault();
              goPrev();
            }}
            className="advert-rail__arrow absolute left-1.5 top-1/2 z-40 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/75 sm:left-2 sm:h-10 sm:w-10"
          >
            <ArrowIcon direction="left" />
          </button>
          <button
            type="button"
            aria-label="Next advert"
            onClick={(event) => {
              event.preventDefault();
              goNext();
            }}
            className="advert-rail__arrow absolute right-1.5 top-1/2 z-40 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/75 sm:right-2 sm:h-10 sm:w-10"
          >
            <ArrowIcon direction="right" />
          </button>
        </div>

      </div>

      <a
        href={WHATSAPP_GROUP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="lottery-pointer"
        aria-label="Join JANTA WhatsApp group"
      >
        <div className="lottery-pointer__bubble">Join group</div>
        <svg
          className="lottery-pointer__hand"
          viewBox="0 0 64 64"
          width="44"
          height="44"
          fill="none"
        >
          <path
            d="M28 6c0-2.2 1.8-4 4-4s4 1.8 4 4v20.5l3.2-2.1c1.9-1.2 4.4-.7 5.6 1.2 1.1 1.8.7 4.1-.9 5.4L38 36.5V48c0 4.4-3.6 8-8 8h-3.5c-3.2 0-6.1-1.7-7.7-4.5L12 37.2c-1.5-2.5-.8-5.7 1.6-7.3 2.2-1.5 5.2-1.1 6.9.9L26 38V6Z"
            fill="#25D366"
            stroke="#0A1630"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M32 2v28M36 8v18.5M40 14v12"
            stroke="#0A1630"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.25"
          />
        </svg>
      </a>
    </div>
  );
}
