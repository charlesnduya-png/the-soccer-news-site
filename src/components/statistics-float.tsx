"use client";

import Image from "next/image";
import Link from "next/link";

/** Floating Statistics TV launcher — bottom-right, above Coach Bolt. */
export function StatisticsFloat() {
  return (
    <Link
      href="/scorers"
      className="statistics-float"
      aria-label="Open Statistics"
      title="Statistics"
    >
      <Image
        src="/statistics-tv.png"
        alt=""
        width={56}
        height={56}
        className="statistics-float__img"
        unoptimized
        aria-hidden
      />
    </Link>
  );
}
