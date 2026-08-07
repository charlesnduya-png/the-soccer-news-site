import type { Metadata } from "next";
import {
  type NewsTopic,
  newsTopicLabel,
} from "@/lib/league-news-config";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://soccer.co.ke";

export const SITE_NAME = "soccer.co.ke";

export const SITE_TAGLINE =
  "European Football News, Live Scores & Tables";

export const DEFAULT_DESCRIPTION =
  "Live scores, news and tables for 15 European leagues — Premier League, La Liga, Bundesliga, Serie A, Ligue 1 and more — plus Kenyan KPL football. Free updates every 2 minutes.";

export const GLOBAL_KEYWORDS = [
  "football news today",
  "live football scores",
  "soccer news",
  "European football news",
  "Premier League news",
  "La Liga news",
  "Bundesliga news",
  "Serie A news",
  "Ligue 1 news",
  "EPL standings",
  "Premier League table",
  "Premier League fixtures",
  "Premier League results",
  "football transfers",
  "Kenya football news",
  "KPL news",
  "Harambee Stars",
  "Gor Mahia news",
  "soccer scores Kenya",
  "free football live scores",
  "football live scores Africa",
  "soccer.co.ke",
];

const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: `${SITE_NAME} — European & Kenya football news, live scores and tables`,
};

type PageMetaOptions = {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
};

/** Trim copy for meta descriptions (~155 chars is ideal for SERP snippets). */
export function metaDescription(text: string, max = 155): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  const slice = cleaned.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  return `${slice.slice(0, lastSpace > 80 ? lastSpace : slice.length)}…`;
}

export function buildPageMetadata({
  title,
  description,
  path = "",
  keywords = [],
  noIndex = false,
}: PageMetaOptions): Metadata {
  const url = `${SITE_URL}${path}`;
  const isHome = path === "" || path === "/";
  const fullTitle = isHome
    ? `Live Football Scores & European League News | ${SITE_NAME}`
    : `${title} | ${SITE_NAME}`;
  const metaDesc = metaDescription(description);

  const allKeywords = [...new Set([...keywords, ...GLOBAL_KEYWORDS])];

  const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

  return {
    title,
    description: metaDesc,
    keywords: allKeywords,
    authors: [{ name: SITE_NAME, url: SITE_URL }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: url,
      languages: {
        "en-US": url,
        "en-KE": url,
        "en-GB": url,
        "x-default": url,
      },
    },
    openGraph: {
      type: "website",
      locale: "en_KE",
      alternateLocale: ["en_US", "en_GB", "es_ES", "fr_FR", "de_DE", "pt_BR", "ar_SA"],
      url,
      siteName: SITE_NAME,
      title: fullTitle,
      description: metaDesc,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      site: "@soccer_co_ke",
      creator: "@soccer_co_ke",
      title: fullTitle,
      description: metaDesc,
      images: [OG_IMAGE.url],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
    category: "sports",
    ...(googleVerification
      ? { verification: { google: googleVerification } }
      : {}),
  };
}

export const rootMetadata: Metadata = {
  ...buildPageMetadata({
    title: SITE_TAGLINE,
    description: DEFAULT_DESCRIPTION,
    path: "/",
    keywords: GLOBAL_KEYWORDS,
  }),
  title: {
    default: `Live Football Scores & European League News | ${SITE_NAME}`,
    template: `%s | ${SITE_NAME}`,
  },
  applicationName: SITE_NAME,
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
};

export const PAGE_SEO = {
  home: {
    ...buildPageMetadata({
      title: SITE_TAGLINE,
      description: DEFAULT_DESCRIPTION,
      path: "/",
      keywords: [
        "football hub Kenya",
        "European league scores",
        "live soccer scores free",
        "football news Africa",
      ],
    }),
    title: `Live Football Scores & European League News | ${SITE_NAME}`,
  },
  standings: buildPageMetadata({
    title: "Premier League Table 2025/26 — Live Standings",
    description:
      "Live Premier League table with points, form, goal difference and European qualification zones. Updated EPL standings for every matchday.",
    path: "/standings",
    keywords: [
      "Premier League table 2025/26",
      "EPL standings today",
      "Premier League table live",
      "football league table",
    ],
  }),
  transfers: buildPageMetadata({
    title: "Football Transfer News — EPL & European Leagues",
    description:
      "Latest transfer news, confirmed signings and rumours from the Premier League and top European leagues. Auto-updated from trusted sources.",
    path: "/transfers",
    keywords: [
      "football transfer news",
      "Premier League transfers",
      "EPL transfer rumours",
      "European transfer news",
      "transfer window news",
    ],
  }),
  fixtures: buildPageMetadata({
    title: "Premier League Fixtures Today — Match Schedule",
    description:
      "Upcoming Premier League fixtures with kick-off times, dates and matchweek schedule. Plan every EPL game — free and always current.",
    path: "/fixtures",
    keywords: [
      "Premier League fixtures today",
      "EPL schedule this week",
      "Premier League kick off times",
      "football fixtures today",
    ],
  }),
  results: buildPageMetadata({
    title: "Premier League Results Today — Live Scores & FT",
    description:
      "Today's Premier League results and full-time scores. Every EPL match result updated automatically after the final whistle.",
    path: "/results",
    keywords: [
      "Premier League results today",
      "EPL scores today",
      "Premier League results yesterday",
      "football results live",
    ],
  }),
  scorers: buildPageMetadata({
    title: "Premier League Top Scorers — Golden Boot Race",
    description:
      "Who leads the Premier League scoring charts? Goals, assists and golden boot standings for every EPL striker this season.",
    path: "/scorers",
    keywords: [
      "Premier League top scorers",
      "EPL golden boot 2025/26",
      "Premier League goals leaders",
      "football top scorers",
    ],
  }),
  teams: buildPageMetadata({
    title: "Premier League Teams 2025/26 — All 20 Clubs",
    description:
      "Browse all 20 Premier League clubs with crests, stadiums and squad info. Your complete guide to every EPL team this season.",
    path: "/teams",
    keywords: [
      "Premier League teams",
      "EPL clubs list",
      "Premier League clubs 2025/26",
      "English football teams",
    ],
  }),
  news: buildPageMetadata({
    title: "Football News Today — 15 European Leagues",
    description:
      "Breaking football news from Premier League, La Liga, Bundesliga, Serie A, Ligue 1 and 10 more European leagues. Headlines updated every 2 minutes.",
    path: "/news",
    keywords: [
      "football news today",
      "European football news",
      "soccer headlines",
      "Premier League news",
      "La Liga news",
      "Bundesliga news",
    ],
  }),
  kenyaFootball: buildPageMetadata({
    title: "Kenya Football News — KPL, Harambee Stars & Gor Mahia",
    description:
      "Latest Kenyan football news: KPL, Harambee Stars, Gor Mahia, AFC Leopards and FKF headlines. Local match reports and scores for fans in Kenya.",
    path: "/kenya-football",
    keywords: [
      "Kenya football news today",
      "KPL news",
      "Harambee Stars news",
      "Gor Mahia news",
      "Kenyan Premier League",
      "FKF news",
      "football news Kenya",
    ],
  }),
} as const;

const NEWS_TOPIC_SEO: Partial<
  Record<NewsTopic, { title: string; description: string; keywords: string[] }>
> = {
  "european-leagues": {
    title: "European Football News Today",
    description:
      "Headlines from 15 top European leagues — EPL, La Liga, Bundesliga, Serie A, Ligue 1 and more. Breaking stories refreshed every 2 minutes.",
    keywords: ["European football news", "soccer news Europe", "football headlines today"],
  },
  "premier-league": {
    title: "Premier League News Today — EPL Headlines",
    description:
      "Breaking Premier League news, match reports, injury updates and analysis. Latest EPL headlines from BBC, Sky Sports, Guardian and more.",
    keywords: ["Premier League news today", "EPL headlines", "English football news"],
  },
  "la-liga": {
    title: "La Liga News Today — Spanish Football Headlines",
    description:
      "Latest La Liga news, Real Madrid and Barcelona updates, match reports and transfer stories from Spain's top flight.",
    keywords: ["La Liga news", "Spanish football news", "Real Madrid news", "Barcelona news"],
  },
  bundesliga: {
    title: "Bundesliga News Today — German Football Headlines",
    description:
      "Bundesliga news, Bayern Munich and Borussia Dortmund updates, match reports and German football headlines.",
    keywords: ["Bundesliga news", "German football news", "Bayern Munich news"],
  },
  "serie-a": {
    title: "Serie A News Today — Italian Football Headlines",
    description:
      "Serie A news, Inter, AC Milan and Juventus updates, match reports and Italian football headlines.",
    keywords: ["Serie A news", "Italian football news", "Serie A headlines"],
  },
  "ligue-1": {
    title: "Ligue 1 News Today — French Football Headlines",
    description:
      "Ligue 1 news, PSG updates, match reports and French football headlines from France's top division.",
    keywords: ["Ligue 1 news", "French football news", "PSG news"],
  },
  "kenyan-football": {
    title: "Kenya Football News Today — KPL & Harambee Stars",
    description:
      "Kenyan football headlines: KPL, Gor Mahia, AFC Leopards, Harambee Stars and FKF news for fans across Kenya.",
    keywords: ["Kenya football news today", "KPL news", "Kenyan soccer news"],
  },
  transfers: {
    title: "Football Transfer News Today — Signings & Rumours",
    description:
      "Transfer news, confirmed deals and rumours from the Premier League and Europe's biggest clubs. Updated throughout the window.",
    keywords: ["football transfer news today", "transfer rumours", "signings news"],
  },
  all: {
    title: "Football News Today — All Leagues",
    description:
      "All football news in one feed — European leagues, transfers and Kenyan football. Curated headlines updated automatically.",
    keywords: ["football news", "soccer news today", "all football headlines"],
  },
};

export function newsTopicMetadata(topic: NewsTopic): Metadata {
  const label = newsTopicLabel(topic);
  const preset = NEWS_TOPIC_SEO[topic];
  const path = topic === "european-leagues" ? "/news" : `/news?topic=${topic}`;

  if (preset) {
    return buildPageMetadata({
      title: preset.title,
      description: preset.description,
      path,
      keywords: preset.keywords,
    });
  }

  const leagueName = label.replace(/^[^\w]+\s*/, "");
  return buildPageMetadata({
    title: `${leagueName} News Today`,
    description: `Latest ${leagueName} headlines — breaking stories, match reports and transfer news updated automatically.`,
    path,
    keywords: [leagueName, "football news", "soccer news today"],
  });
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: ["Soccer Co Ke", "Soccer Kenya"],
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    inLanguage: "en",
    about: [
      { "@type": "SportsOrganization", name: "Premier League" },
      { "@type": "SportsOrganization", name: "Kenyan Premier League" },
    ],
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: DEFAULT_DESCRIPTION,
    areaServed: ["KE", "GB", "Worldwide"],
    knowsAbout: [
      "Football",
      "Soccer",
      "Premier League",
      "La Liga",
      "Bundesliga",
      "Serie A",
      "Kenyan football",
    ],
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export function newsCollectionJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "European Football News Today",
    description:
      "Breaking football news from 15 European leagues plus Kenyan football — updated every 2 minutes.",
    url: `${SITE_URL}/news`,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

export function webPageJsonLd(title: string, description: string, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: `${SITE_URL}${path}`,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}
