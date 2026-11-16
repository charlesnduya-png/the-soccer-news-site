import { createHash } from "crypto";
import Parser from "rss-parser";
import { GoogleDecoder } from "google-news-url-decoder";
import {
  ALL_NEWS_TOPICS,
  getLeagueConfig,
  isLeagueSlug,
  LEAGUE_NEWS_CONFIG,
  LEAGUE_SLUGS,
  leagueRssFeeds,
  leagueSourceLabel,
  matchesEuropeanLeagues,
  matchesLeagueArticle,
  type LeagueSlug,
  type NewsTopic,
} from "./league-news-config";
import type { NewsArticle } from "./types";
import {
  getPublishedAdminNews,
  getAdminPost,
  parseAdminPostNewsId,
  adminPostToNewsArticle,
} from "./admin-store";
import {
  extractVideoUrlFromHtml,
  isLikelyVideoUrl,
  looksLikeVideoStory,
  videoDescription,
  videoPosterUrl,
} from "./news-video";


export type { NewsTopic } from "./league-news-config";
export { ALL_NEWS_TOPICS, getNewsTopicFromParam, newsTopicLabel } from "./league-news-config";

export type NewsSnapshot = {
  articles: NewsArticle[];
  fetchedAt: string;
  newestArticleAt: string | null;
  successfulSources: string[];
  failedSources: string[];
  isFallback: boolean;
  degraded: boolean;
};

const parser = new Parser({
  customFields: {
    item: [
      ["media:content", "mediaContent"],
      ["media:thumbnail", "mediaThumbnail"],
      ["media:group", "mediaGroup"],
    ],
  },
});

const FETCH_TIMEOUT_MS = 3000;
const DEFAULT_LIMIT = 24;
/** Fresher feed — client polls every 2 min; keep server cache slightly longer. */
const CACHE_TTL_MS = 3 * 60 * 1000;
const RETRY_CACHE_TTL_MS = 45 * 1000;
/** Cap cold news refresh so page TTFB stays short (stale-while-revalidate covers the rest). */
const NEWS_REFRESH_BUDGET_MS = 5_000;
/** Image scrapes run in the background after first publish. */
const IMAGE_ENRICH_BUDGET_MS = 8_000;
const NEWS_POOL_SIZE = 50;
const ARTICLE_CONTENT_MAX_CHARS = 20_000;
/** Free GNews plans rate-limit quickly — pause after 429 and space out calls. */
const GNEWS_COOLDOWN_MS = 60 * 60 * 1000;
/** Per-topic spacing so warm of europe/transfers/kenya can each get a turn. */
const GNEWS_MIN_INTERVAL_MS = 12 * 60 * 1000;
/** Global gap between any two GNews HTTP calls (protects free tier). */
const GNEWS_GLOBAL_GAP_MS = 75 * 1000;

type NewsCacheEntry = NewsSnapshot & { expiresAt: number };

const newsCache = new Map<NewsTopic, NewsCacheEntry>();
const newsRefreshes = new Map<NewsTopic, Promise<NewsCacheEntry>>();
const articleByIdCache = new Map<
  string,
  { article: NewsArticle; expiresAt: number }
>();
const articleDetailsCache = new Map<
  string,
  { content?: string; videoUrl?: string; image?: string; expiresAt: number }
>();
const decodedGoogleNewsCache = new Map<string, { url: string; expiresAt: number }>();

let googleNewsDecoder: GoogleDecoder | null = null;
let gnewsCooldownUntil = 0;
let gnewsGlobalNextAt = 0;
const gnewsNextAllowedByTopic = new Map<NewsTopic, number>();
const gnewsTopicCache = new Map<
  NewsTopic,
  { articles: NewsArticle[]; expiresAt: number }
>();

function getGoogleNewsDecoder(): GoogleDecoder {
  if (!googleNewsDecoder) googleNewsDecoder = new GoogleDecoder();
  return googleNewsDecoder;
}

/** Expire news snapshots while retaining last-known-good data for outage recovery. */
export function clearNewsCache() {
  for (const [topic, entry] of newsCache) {
    newsCache.set(topic, { ...entry, expiresAt: 0 });
  }
}

/** Premier League–focused feeds */
const PL_RSS_FEEDS = [
  { url: "https://www.skysports.com/rss/12040", source: "Sky Sports PL" },
  { url: "https://www.theguardian.com/football/premierleague/rss", source: "Guardian PL" },
  { url: "https://feeds.bbci.co.uk/sport/football/rss.xml", source: "BBC Sport" },
  { url: "https://www.espn.com/espn/rss/soccer/news", source: "ESPN Soccer" },
] as const;

/** Transfer-first feeds (still filtered by isTransferArticle). */
const TRANSFER_RSS_FEEDS = [
  {
    url: "https://feeds.bbci.co.uk/sport/football/transfers/rss.xml",
    source: "BBC Transfers",
  },
  {
    url: "https://news.google.com/rss/search?q=%22Premier%20League%22%20(transfer%20OR%20signing%20OR%20loan%20OR%20%22linked%20with%22)%20when%3A14d&hl=en-GB&gl=GB&ceid=GB%3Aen",
    source: "Google News Transfers",
  },
  ...PL_RSS_FEEDS,
] as const;

/** YouTube Atom feeds — reliable video + thumbnail for home cards */
const YOUTUBE_VIDEO_FEEDS = [
  {
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCG5qGWdu8nIRZqJ_GgDwQ-w",
    source: "Premier League",
  },
  {
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCNAf1k0yIjyGu3k9BwAg3lg",
    source: "Sky Sports Football",
  },
] as const;

/** Kenyan football feeds */
const KENYAN_RSS_FEEDS = [
  { url: "https://www.standardmedia.co.ke/rss/sports.php", source: "Standard Sports" },
  {
    url: "https://news.google.com/rss/search?q=%22Gor%20Mahia%22%20OR%20%22AFC%20Leopards%22%20OR%20%22Harambee%20Stars%22%20OR%20%22Kenya%20Premier%20League%22%20OR%20KPL%20when%3A14d&hl=en-KE&gl=KE&ceid=KE%3Aen",
    source: "Google News Kenya",
  },
  {
    url: "https://news.google.com/rss/search?q=%22Kenya%20football%22%20OR%20FKF%20OR%20%22SportPesa%20Premier%20League%22%20OR%20%22Kenya%20Police%20FC%22%20OR%20Tusker%20OR%20Sofapaka%20when%3A14d&hl=en-KE&gl=KE&ceid=KE%3Aen",
    source: "Google News KPL",
  },
] as const;

/** All football feeds */
const ALL_RSS_FEEDS = [
  ...PL_RSS_FEEDS,
  { url: "https://www.theguardian.com/football/rss", source: "Guardian Football" },
] as const;

const PL_KEYWORDS = [
  "premier league",
  "epl",
  "english premier",
  "top flight",
  "liverpool",
  "arsenal",
  "manchester united",
  "manchester city",
  "man utd",
  "man city",
  "chelsea",
  "tottenham",
  "spurs",
  "newcastle",
  "aston villa",
  "brighton",
  "west ham",
  "wolves",
  "everton",
  "fulham",
  "crystal palace",
  "bournemouth",
  "brentford",
  "nottingham forest",
  "leicester",
  "leeds",
  "burnley",
  "sunderland",
  "salah",
  "haaland",
  "saka",
  "palmer",
  "arteta",
  "slot",
  "guardiola",
  "anfield",
  "emirates",
  "old trafford",
  "stamford bridge",
  "var",
  "penalty",
  "red card",
  "transfer",
  "signing",
  "loan",
  "golden boot",
  "match report",
  "full-time",
  "half-time",
];

const KENYAN_FOOTBALL_KEYWORDS = [
  "kenya football",
  "kenyan football",
  "harambee stars",
  "harambee starlets",
  "junior starlets",
  "fkf",
  "kenya premier league",
  "kenyan premier league",
  "kpl",
  "gor mahia",
  "afc leopards",
  "tusker fc",
  "tusker ",
  "bandari fc",
  "bandari ",
  "kcb fc",
  "mathare united",
  "kenya police fc",
  "kenya police",
  "sofapaka",
  "shabana",
  "ulinzi stars",
  "kakamega homeboyz",
  "kariobangi sharks",
  "mara sugar",
  "murang'a seal",
  "muranga seal",
  "nairobi united",
  "posta rangers",
  "bidco united",
  "aps bomet",
  "victor wanyama",
  "michael olunga",
  "collins sichenje",
  "kenya national team",
  "kenya women football",
  "kenya vs",
  "nyayo national stadium",
  "kasarani",
  "moi international sports centre",
  "fkf premier league",
  "sportpesa premier league",
  "cecafa",
  "kagame cup",
];

const KENYAN_NON_FOOTBALL = [
  "polo",
  "rugby",
  "cricket",
  "athletics",
  "volleyball",
  "basketball",
  "hockey",
  "netball",
  "boxing",
  "swimming",
  "feassa",
];

/** Strong transfer signals only — vague words like "deal"/"move"/"confirmed" leaked match reports. */
const TRANSFER_KEYWORDS = [
  "transfer",
  "transfers",
  "transfer rumour",
  "transfer rumor",
  "transfer news",
  "transfer talk",
  "transfer window",
  "transfer fee",
  "deadline day",
  "new signing",
  "signing",
  "signed for",
  "signs for",
  "signs with",
  "on loan",
  "loan deal",
  "loaned",
  "joins",
  "joined",
  "set to join",
  "set to sign",
  "bid for",
  "transfer bid",
  "contract offer",
  "linked with",
  "interest in",
  "close to signing",
  "close to joining",
  "here we go",
  "completes move",
  "permanent deal",
  "medical",
  "done deal",
  "papers:",
];

const TRANSFER_NOISE = [
  "as it happened",
  "match report",
  "player ratings",
  "liveblog",
  "live blog",
  "dig in for draw",
  "unbeaten start",
  "propping up table",
  "rescues late point",
  "women's champions league",
  "womens champions league",
  "wcl:",
  "champions league, as they",
];


/** Canonicalize article URLs so IDs stay stable across tracking-param noise. */
function canonicalArticleLink(link: string): string {
  try {
    const url = new URL(link.trim());
    url.hash = "";
    for (const key of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
    ]) {
      url.searchParams.delete(key);
    }
    const search = url.searchParams.toString();
    return `${url.origin}${url.pathname.replace(/\/$/, "")}${search ? `?${search}` : ""}`;
  } catch {
    return link.trim();
  }
}

function isLikelyArticleUrl(link: string): boolean {
  return (
    /\/articles?\//i.test(link) ||
    /news\.google\.com\/(?:rss\/)?articles\//i.test(link) ||
    /\/\d{4}\/\d{2}\//.test(link) ||
    /\/(story|news|post|football)\//i.test(link)
  );
}

/** Stable SHA-256 id from the article link (title only for shared homepage URLs). */
function articleIdFromLink(link: string, title = ""): string {
  const canonical = canonicalArticleLink(link);
  const seed = isLikelyArticleUrl(canonical)
    ? canonical
    : `${canonical}|${title.trim().slice(0, 80).toLowerCase()}`;
  return createHash("sha256").update(seed).digest("base64url").slice(0, 20);
}

function makeArticle(
  partial: Omit<NewsArticle, "id"> & { id?: string }
): NewsArticle {
  return {
    ...partial,
    id: partial.id ?? articleIdFromLink(partial.link, partial.title),
  };
}

const plFallbackNews: NewsArticle[] = [
  makeArticle({
    title: "Premier League title race heats up",
    description:
      "Liverpool, Arsenal and Manchester City battle for the crown with key fixtures ahead.",
    link: "https://www.premierleague.com",
    pubDate: new Date().toISOString(),
    source: "Premier League",
  }),
  makeArticle({
    title: "Transfer window: latest Premier League deals",
    description: "All the confirmed signings and rumours from England's top flight.",
    link: "https://www.bbc.com/sport/football/premier-league",
    pubDate: new Date(Date.now() - 3600000).toISOString(),
    source: "BBC Sport",
  }),
  makeArticle({
    title: "Premier League table — live standings",
    description: "Points, form and goal difference for all 20 clubs updated on soccer.co.ke.",
    link: "https://soccer.co.ke/standings",
    pubDate: new Date(Date.now() - 7200000).toISOString(),
    source: "soccer.co.ke",
  }),
];

const transferFallbackNews: NewsArticle[] = [
  makeArticle({
    title: "Premier League transfer news — latest deals",
    description:
      "Confirmed signings, loans and rumours across Liverpool, Arsenal, Chelsea, Man City and more.",
    link: "https://www.skysports.com/transfer-centre",
    pubDate: new Date().toISOString(),
    source: "Sky Sports",
  }),
  makeArticle({
    title: "Who's next? Premier League clubs hunting new signings",
    description: "The latest transfer links and bids involving England's top clubs.",
    link: "https://www.bbc.com/sport/football/transfers",
    pubDate: new Date(Date.now() - 3600000).toISOString(),
    source: "BBC Sport",
  }),
];

const allFallbackNews: NewsArticle[] = [...plFallbackNews];

const kenyanFallbackNews: NewsArticle[] = [
  makeArticle({
    title: "Harambee Stars — latest Kenya national team news",
    description:
      "Updates on Kenya's national football team, qualifiers, friendlies and squad news.",
    link: "https://www.standardmedia.co.ke/sports/category/29/football",
    pubDate: new Date().toISOString(),
    source: "Standard Sports",
  }),
  makeArticle({
    title: "Kenya Premier League — KPL news & results",
    description:
      "Gor Mahia, AFC Leopards, Tusker and all KPL clubs — standings, fixtures and match reports.",
    link: "https://www.standardmedia.co.ke/sports/category/29/football",
    pubDate: new Date(Date.now() - 3600000).toISOString(),
    source: "Standard Sports",
  }),
  makeArticle({
    title: "Kenyan football on soccer.co.ke",
    description:
      "Local football headlines from Kenya — Harambee Stars, KPL, FKF and more, updated automatically.",
    link: "https://soccer.co.ke/kenya-football",
    pubDate: new Date(Date.now() - 7200000).toISOString(),
    source: "soccer.co.ke",
  }),
];

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout: ${label}`)), ms);
    }),
  ]);
}

function dedupeArticles(articles: NewsArticle[]): NewsArticle[] {
  const seenTitles = new Set<string>();
  const seenLinks = new Set<string>();
  const seenIds = new Set<string>();

  return articles.filter((article) => {
    const titleKey = article.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .slice(0, 100);
    let linkKey = "";

    try {
      const url = new URL(article.link);
      url.hash = "";
      // Keep article path identity; strip only tracking noise later if needed.
      linkKey = `${url.origin}${url.pathname}`.replace(/\/$/, "");
    } catch {
      // Keep title-based deduplication for malformed or relative links.
    }

    if (
      (article.id && seenIds.has(article.id)) ||
      (titleKey && seenTitles.has(titleKey)) ||
      (linkKey && seenLinks.has(linkKey))
    ) {
      return false;
    }
    if (article.id) seenIds.add(article.id);
    if (titleKey) seenTitles.add(titleKey);
    if (linkKey) seenLinks.add(linkKey);
    return true;
  });
}

function asMediaList(value: unknown): Array<{ $?: Record<string, string> }> {
  if (!value) return [];
  if (Array.isArray(value)) return value as Array<{ $?: Record<string, string> }>;
  return [value as { $?: Record<string, string> }];
}


function absoluteImageUrl(candidate: string, baseUrl?: string): string | undefined {
  const value = decodeHtmlEntities(candidate.trim());
  if (!value) return undefined;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("//")) return `https:${value}`;
  if (!baseUrl) return undefined;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return undefined;
  }
}


function findJsonLdImage(value: unknown, baseUrl?: string): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const image = findJsonLdImage(item, baseUrl);
      if (image) return image;
    }
    return undefined;
  }

  const object = value as Record<string, unknown>;
  const image = object.image;
  if (typeof image === "string") {
    const absolute = absoluteImageUrl(image, baseUrl);
    if (absolute) return absolute;
  }
  if (Array.isArray(image)) {
    for (const item of image) {
      if (typeof item === "string") {
        const absolute = absoluteImageUrl(item, baseUrl);
        if (absolute) return absolute;
      }
      if (item && typeof item === "object") {
        const url = (item as { url?: string }).url;
        if (url) {
          const absolute = absoluteImageUrl(url, baseUrl);
          if (absolute) return absolute;
        }
      }
    }
  }
  if (image && typeof image === "object") {
    const url = (image as { url?: string }).url;
    if (url) {
      const absolute = absoluteImageUrl(url, baseUrl);
      if (absolute) return absolute;
    }
  }

  for (const nested of Object.values(object)) {
    const found = findJsonLdImage(nested, baseUrl);
    if (found) return found;
  }
  return undefined;
}

function extractOgImageFromHtml(html: string, baseUrl?: string): string | undefined {
  const patterns = [
    /property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*property=["']og:image(?::secure_url)?["']/i,
    /property=["']og:image(?::secure_url)?["'][\s\S]*?content=["']([^"']+)["']/i,
    /name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*name=["']twitter:image(?::src)?["']/i,
    /name=["']twitter:image(?::src)?["'][\s\S]*?content=["']([^"']+)["']/i,
    /rel=["']image_src["'][^>]*href=["']([^"']+)["']/i,
    /href=["']([^"']+)["'][^>]*rel=["']image_src["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const absolute = match?.[1] ? absoluteImageUrl(match[1], baseUrl) : undefined;
    if (absolute && !isGenericNewsImage(absolute)) return absolute;
  }

  const scripts = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const match of scripts) {
    try {
      const image = findJsonLdImage(JSON.parse(match[1]), baseUrl);
      if (image && !isGenericNewsImage(image)) return image;
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }

  // Last resort: first plausible <img> in the article body (skip icons/sprites).
  const articleHtml = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] ?? html;
  for (const match of articleHtml.matchAll(/<img\b[^>]+>/gi)) {
    const tag = match[0];
    const src =
      tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ??
      tag.match(/\bdata-src=["']([^"']+)["']/i)?.[1] ??
      tag.match(/\bdata-lazy-src=["']([^"']+)["']/i)?.[1];
    if (!src) continue;
    if (/sprite|logo|icon|avatar|pixel|1x1|spacer|badge|emoji/i.test(src)) continue;
    const width = Number(tag.match(/\bwidth=["']?(\d+)/i)?.[1] ?? 0);
    const height = Number(tag.match(/\bheight=["']?(\d+)/i)?.[1] ?? 0);
    if ((width > 0 && width < 120) || (height > 0 && height < 80)) continue;
    const absolute = absoluteImageUrl(src, baseUrl);
    if (absolute && !isGenericNewsImage(absolute) && !isLikelyVideoUrl(absolute)) {
      return absolute;
    }
  }

  return undefined;
}

function extractImage(item: Record<string, unknown>, baseUrl?: string): string | undefined {
  const base =
    baseUrl ??
    (typeof item.link === "string"
      ? item.link
      : typeof item.guid === "string"
        ? item.guid
        : undefined);

  for (const media of asMediaList(item.mediaContent)) {
    const url = media.$?.url;
    const type = media.$?.type;
    const medium = media.$?.medium;
    const absolute = url ? absoluteImageUrl(url, base) : undefined;
    if (!absolute) continue;
    if (medium === "video" || isLikelyVideoUrl(absolute, type)) continue;
    return absolute;
  }

  const mediaThumbnail = item.mediaThumbnail as
    | { $?: { url?: string } }
    | Array<{ $?: { url?: string } }>
    | undefined;
  if (Array.isArray(mediaThumbnail)) {
    for (const thumb of mediaThumbnail) {
      const absolute = thumb.$?.url ? absoluteImageUrl(thumb.$.url, base) : undefined;
      if (absolute) return absolute;
    }
  } else if (mediaThumbnail?.$?.url) {
    const absolute = absoluteImageUrl(mediaThumbnail.$.url, base);
    if (absolute) return absolute;
  }

  const group = item.mediaGroup as Record<string, unknown> | undefined;
  if (group) {
    for (const thumb of asMediaList(group["media:thumbnail"] ?? group.mediaThumbnail)) {
      const absolute = thumb.$?.url ? absoluteImageUrl(thumb.$.url, base) : undefined;
      if (absolute) return absolute;
    }
  }

  const enclosure = item.enclosure as { url?: string; type?: string } | undefined;
  if (enclosure?.url) {
    const absolute = absoluteImageUrl(enclosure.url, base);
    if (absolute && !isLikelyVideoUrl(absolute, enclosure.type)) {
      return absolute;
    }
  }

  const content = String(item.content ?? item["content:encoded"] ?? item.summary ?? "");
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch?.[1]) {
    const absolute = absoluteImageUrl(imgMatch[1], base);
    if (absolute) return absolute;
  }

  return extractOgImageFromHtml(content, base);
}

function extractVideo(item: Record<string, unknown>): string | undefined {
  const enclosure = item.enclosure as { url?: string; type?: string } | undefined;
  if (enclosure?.url?.startsWith("http") && isLikelyVideoUrl(enclosure.url, enclosure.type)) {
    return enclosure.url;
  }

  for (const media of asMediaList(item.mediaContent)) {
    const url = media.$?.url;
    const type = media.$?.type;
    const medium = media.$?.medium;
    if (!url?.startsWith("http")) continue;
    if (medium === "video" || isLikelyVideoUrl(url, type)) return url;
  }

  const group = item.mediaGroup as Record<string, unknown> | undefined;
  if (group) {
    for (const media of asMediaList(group["media:content"] ?? group.mediaContent)) {
      const url = media.$?.url;
      const type = media.$?.type;
      const medium = media.$?.medium;
      if (!url?.startsWith("http")) continue;
      if (medium === "video" || isLikelyVideoUrl(url, type)) return url;
    }
  }

  const content = String(item.content ?? item["content:encoded"] ?? item.summary ?? "");
  return extractVideoUrlFromHtml(content);
}

function findArticleBody(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const body = findArticleBody(item);
      if (body) return body;
    }
    return undefined;
  }

  const object = value as Record<string, unknown>;
  if (typeof object.articleBody === "string") return object.articleBody;

  for (const nested of Object.values(object)) {
    const body = findArticleBody(nested);
    if (body) return body;
  }
  return undefined;
}

function cleanPublisherContent(text: string): string {
  return decodeHtmlEntities(text.replace(/<[^>]*>/g, " "))
    .replace(/\\n/g, "\n")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractPublisherContent(html: string): string | undefined {
  const scripts = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );

  for (const match of scripts) {
    try {
      const body = findArticleBody(JSON.parse(match[1]));
      const clean = body ? cleanPublisherContent(body) : "";
      if (clean.length >= 180) {
        return clean.slice(0, ARTICLE_CONTENT_MAX_CHARS);
      }
    } catch {
      // Some publishers expose malformed JSON-LD; try article paragraphs next.
    }
  }

  // Some publishers include literal newlines inside articleBody, which makes
  // their otherwise useful JSON-LD invalid JSON. Read that field directly.
  const rawBody = html.match(
    /"articleBody"\s*:\s*"([\s\S]*?)"\s*,\s*"(?:datePublished|dateModified|author|publisher|mainEntityOfPage|image)"/i
  )?.[1];
  if (rawBody) {
    const clean = cleanPublisherContent(rawBody);
    if (clean.length >= 180) {
      return clean.slice(0, ARTICLE_CONTENT_MAX_CHARS);
    }
  }

  const articleMatch = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  if (!articleMatch) return undefined;

  const paragraphs = Array.from(
    articleMatch[1].matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi),
    (match) => stripHtml(match[1])
  ).filter(
    (paragraph) =>
      paragraph.length >= 50 &&
      !/^(read more|also read|advertisement|related|sign up|subscribe)/i.test(
        paragraph
      )
  );

  const content = paragraphs.join("\n\n");
  return content.length >= 180
    ? content.slice(0, ARTICLE_CONTENT_MAX_CHARS)
    : undefined;
}

function isGenericNewsImage(url?: string): boolean {
  if (!url) return true;
  return (
    /googleusercontent\.com\/J6_coFbogxhRI9iM864NL/i.test(url) ||
    /news\.google\.com\/.*favicon/i.test(url) ||
    /\/__og-image__\//i.test(url) ||
    /\/og-image[-.][^/]+\.(?:png|webp)(?:\?|$)/i.test(url)
  );
}

function isUsableNewsImage(url?: string): boolean {
  if (!url) return false;
  // Admin-uploaded covers are served from our own media route.
  if (url.startsWith("/api/admin/media/")) return true;
  return url.startsWith("http") && !isGenericNewsImage(url);
}

async function decodeGoogleNewsLink(url: string): Promise<string | undefined> {
  if (!url.includes("news.google.com")) return undefined;

  const cached = decodedGoogleNewsCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  try {
    const result = await getGoogleNewsDecoder().decode(url);
    if (result.status && result.decoded_url?.startsWith("http")) {
      decodedGoogleNewsCache.set(url, {
        url: result.decoded_url,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
      return result.decoded_url;
    }
  } catch (error) {
    console.error("Google News decode failed:", error);
  }

  return undefined;
}

async function resolveArticleLink(url: string): Promise<string> {
  if (!url.includes("news.google.com")) return url;

  const decoded = await decodeGoogleNewsLink(url);
  if (decoded) return decoded;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; soccer.co.ke/1.0; +https://soccer.co.ke)",
      },
    });
    if (res.url && !res.url.includes("news.google.com")) {
      return res.url;
    }
    return url;
  } catch {
    return url;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchPublisherDetails(
  url: string,
  resolvedUrl?: string
): Promise<{ content?: string; videoUrl?: string; image?: string }> {
  if (!url.startsWith("http")) return {};

  const publisherUrl = resolvedUrl ?? (await resolveArticleLink(url));

  // Never scrape Google News interstitial pages — their og:image/body are shared/wrong.
  if (publisherUrl.includes("news.google.com")) {
    return {};
  }

  const cacheKey =
    publisherUrl !== url ? `${url}::${publisherUrl}` : publisherUrl;
  const cached = articleDetailsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      content: cached.content,
      videoUrl: cached.videoUrl,
      image: cached.image,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(publisherUrl, {
      next: { revalidate: 600 },
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
      },
      redirect: "follow",
    });

    if (!res.ok) return {};

    const finalUrl = res.url || publisherUrl;
    if (finalUrl.includes("news.google.com")) return {};

    const html = (await res.text()).slice(0, 750_000);
    const image = extractOgImageFromHtml(html, finalUrl);
    const details = {
      content: extractPublisherContent(html),
      videoUrl: extractVideoUrlFromHtml(html),
      image: isUsableNewsImage(image) ? image : undefined,
    };
    articleDetailsCache.set(cacheKey, {
      ...details,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });
    return details;
  } catch {
    return {};
  } finally {
    clearTimeout(timer);
  }
}

function stripHtml(text: string): string {
  return decodeHtmlEntities(text.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(text: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "…",
    ldquo: "“",
    lsquo: "‘",
    lt: "<",
    nbsp: " ",
    ndash: "–",
    quot: '"',
    rdquo: "”",
    rsquo: "’",
  };

  return text.replace(
    /&(#x[\da-f]+|#\d+|[a-z]+);/gi,
    (entity, code: string) => {
      if (code.startsWith("#x")) {
        return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
      }
      if (code.startsWith("#")) {
        return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
      }
      return named[code.toLowerCase()] ?? entity;
    }
  );
}

function normalizeDate(value?: string): string {
  if (!value) return new Date(0).toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? new Date(0).toISOString()
    : parsed.toISOString();
}

function isExcludedSport(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  const exclude = [
    "tennis",
    "f1",
    "formula 1",
    "cricket",
    "rugby",
    "golf",
    "darts",
    "snooker",
    "boxing",
    "nba",
    "nfl",
    "royal ascot",
    "horse racing",
    "cycling",
    "motogp",
    "mercedes",
    "polo",
    "volleyball",
    "basketball",
    "netball",
    "athletics",
    "feassa",
  ];
  return exclude.some((kw) => text.includes(kw));
}

export function isPremierLeagueArticle(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  if (isExcludedSport(title, description)) return false;
  return PL_KEYWORDS.some((kw) => text.includes(kw));
}

export function isKenyanFootballArticle(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  if (isExcludedSport(title, description)) return false;
  if (KENYAN_NON_FOOTBALL.some((kw) => text.includes(kw))) return false;

  // Strong club / national-team signals first.
  if (KENYAN_FOOTBALL_KEYWORDS.some((kw) => text.includes(kw))) return true;

  const hasKenya =
    text.includes("kenya") || text.includes("harambee") || text.includes("fkf");
  const hasFootball =
    text.includes("football") ||
    text.includes("soccer") ||
    text.includes("fifa") ||
    text.includes("caf") ||
    text.includes("premier league") ||
    text.includes("midfielder") ||
    text.includes("striker") ||
    text.includes("goalkeeper") ||
    text.includes("transfer");

  return hasKenya && hasFootball;
}

function isLikelyKenyanPublisher(source: string): boolean {
  const text = source.toLowerCase();
  return /kenya|harambee|gor|leopard|kpl|fkf|mozzart|pulse|standard|citizen|nation|kbc|sportpesa|capital fm|the-star|tuko|mpasho/i.test(
    text
  );
}

function isTransferNoise(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  if (TRANSFER_NOISE.some((kw) => text.includes(kw))) return true;
  // Scoreline in the title is almost always a match report, not a transfer.
  if (/\b\d+\s*[-–]\s*\d+\b/.test(title)) return true;
  return false;
}

function isManagerialAppointment(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  if (/(sack|sacked|fired|dismissed|chaos that took|treated badly)/i.test(text)) {
    return false;
  }
  const role =
    /(manager|head coach|boss|appointed|appoints|to become .+ boss|to become .+ manager|to become .+ coach)/i.test(
      text
    );
  const move =
    /(join|joins|joined|deal|agrees|agree|set to|close to|become|becomes|take over|take charge)/i.test(
      text
    );
  return role && move;
}

export function isTransferArticle(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  if (isExcludedSport(title, description)) return false;
  if (isTransferNoise(title, description)) return false;

  const hasTransfer = TRANSFER_KEYWORDS.some((kw) => text.includes(kw));
  const managerial = isManagerialAppointment(title, description);
  if (!hasTransfer && !managerial) return false;

  // Keep the board Premier League / big-club focused.
  return (
    isPremierLeagueArticle(title, description) ||
    text.includes("premier league") ||
    text.includes("transfer")
  );
}

function matchesTopic(title: string, description: string, topic: NewsTopic): boolean {
  if (topic === "transfers") return isTransferArticle(title, description);
  if (topic === "kenyan-football") return isKenyanFootballArticle(title, description);
  if (isLeagueSlug(topic)) return matchesLeagueArticle(title, description, topic);
  if (topic === "european-leagues") return matchesEuropeanLeagues(title, description);
  return (
    matchesEuropeanLeagues(title, description) ||
    isKenyanFootballArticle(title, description) ||
    `${title} ${description}`.toLowerCase().includes("football") ||
    `${title} ${description}`.toLowerCase().includes("soccer")
  );
}

function feedsForTopic(topic: NewsTopic) {
  if (topic === "kenyan-football") return KENYAN_RSS_FEEDS;
  if (topic === "transfers") return [...TRANSFER_RSS_FEEDS];
  if (topic === "premier-league") return PL_RSS_FEEDS;
  if (isLeagueSlug(topic)) {
    const league = getLeagueConfig(topic);
    return [{ url: league.googleNewsRss, source: leagueSourceLabel(topic) }];
  }
  if (topic === "european-leagues") {
    // All league Google News feeds first so home shows PL, La Liga, Bundesliga…
    // Keep a couple of PL publisher feeds for image-rich Premier League cards.
    return [
      ...leagueRssFeeds().map(({ url, source }) => ({ url, source })),
      ...PL_RSS_FEEDS.slice(0, 2),
    ];
  }
  return [
    ...KENYAN_RSS_FEEDS,
    ...ALL_RSS_FEEDS,
    ...leagueRssFeeds().map(({ url, source }) => ({ url, source })),
  ];
}

function gnewsQueryForTopic(topic: NewsTopic): string {
  if (isLeagueSlug(topic)) return getLeagueConfig(topic).gnewsQuery;
  if (topic === "transfers") {
    return '"Premier League" transfer OR signing OR loan OR "transfer window" OR joins Arsenal OR Liverpool OR Chelsea OR "Man City" OR "Man United"';
  }
  if (topic === "kenyan-football") {
    return '"Kenya football" OR "Harambee Stars" OR KPL OR "Gor Mahia" OR "AFC Leopards" OR FKF OR "Kenya Premier League"';
  }
  if (topic === "european-leagues") {
    return (
      '"La Liga" OR Bundesliga OR "Serie A" OR "Ligue 1" OR Eredivisie OR ' +
      '"Primeira Liga" OR "Belgian Pro League" OR "Scottish Premiership" OR ' +
      '"Swiss Super League" OR "Austrian Bundesliga" OR "Super Lig" OR ' +
      'Allsvenskan OR Eliteserien OR "Danish Superliga"'
    );
  }
  return '"Premier League" OR "La Liga" OR Bundesliga OR "Kenya football" OR football OR soccer';
}

function gnewsCountryForTopic(topic: NewsTopic): string {
  if (topic === "kenyan-football") return "ke";
  if (isLeagueSlug(topic)) return getLeagueConfig(topic).gnewsCountry;
  return "gb";
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      next: { revalidate: 120 },
      signal: controller.signal,
      headers: {
        "User-Agent": "soccer.co.ke/1.0 (+https://soccer.co.ke)",
        Accept: "application/rss+xml, application/xml, text/xml, application/atom+xml, */*",
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFromGNews(limit: number, topic: NewsTopic): Promise<NewsArticle[]> {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) return [];

  const now = Date.now();
  const cached = gnewsTopicCache.get(topic);
  if (cached && cached.expiresAt > now) {
    return cached.articles.slice(0, limit);
  }

  // After a 429, skip GNews entirely for a while — RSS still powers the site.
  const topicAllowedAt = gnewsNextAllowedByTopic.get(topic) ?? 0;
  if (
    now < gnewsCooldownUntil ||
    now < gnewsGlobalNextAt ||
    now < topicAllowedAt
  ) {
    return cached?.articles.slice(0, limit) ?? [];
  }

  // Reserve slots before any await so parallel topic refreshes cannot stampede.
  gnewsGlobalNextAt = now + GNEWS_GLOBAL_GAP_MS;
  gnewsNextAllowedByTopic.set(topic, now + GNEWS_MIN_INTERVAL_MS);

  const params = new URLSearchParams({
    q: gnewsQueryForTopic(topic),
    lang: "en",
    country: gnewsCountryForTopic(topic),
    max: String(Math.min(limit, 10)),
    apikey: apiKey,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`https://gnews.io/api/v4/search?${params}`, {
      next: { revalidate: 1800 },
      signal: controller.signal,
    });

    if (res.status === 429) {
      gnewsCooldownUntil = Date.now() + GNEWS_COOLDOWN_MS;
      gnewsGlobalNextAt = gnewsCooldownUntil;
      gnewsNextAllowedByTopic.set(topic, gnewsCooldownUntil);
      console.warn(
        "GNews rate limited (429). Pausing GNews for 1 hour; RSS feeds continue."
      );
      return cached?.articles.slice(0, limit) ?? [];
    }

    if (!res.ok) {
      if (res.status !== 403) {
        console.warn(`GNews API skipped: HTTP ${res.status}`);
      }
      return cached?.articles.slice(0, limit) ?? [];
    }

    const data = (await res.json()) as {
      articles?: Array<{
        title: string;
        description: string;
        url: string;
        image?: string;
        publishedAt: string;
        source: { name: string };
      }>;
    };

    const articles = (data.articles ?? [])
      .filter((item) => matchesTopic(item.title, item.description ?? "", topic))
      .map((item) =>
        makeArticle({
          title: item.title,
          description: stripHtml(item.description ?? "").slice(0, 500),
          link: item.url,
          pubDate: normalizeDate(item.publishedAt),
          source: `GNews · ${item.source.name}`,
          image: item.image,
        })
      );

    gnewsTopicCache.set(topic, {
      articles,
      expiresAt: Date.now() + GNEWS_MIN_INTERVAL_MS,
    });

    return articles.slice(0, limit);
  } catch (error) {
    console.warn("GNews fetch failed; continuing with RSS only.", error);
    return cached?.articles.slice(0, limit) ?? [];
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFromRssFeed(
  feed: { url: string; source: string },
  topic: NewsTopic
): Promise<NewsArticle[]> {
  try {
    const xml = await fetchText(feed.url);
    const result = await withTimeout(
      Promise.resolve(parser.parseString(xml)),
      FETCH_TIMEOUT_MS,
      `${feed.source} parse`
    );

    const plFeed = feed.source.includes("PL") || feed.source.includes("Premier");
    const leagueFeed = feed.source.startsWith("Google News ·");
    // Cap per-feed take so one league (esp. PL publishers) cannot flood Europe.
    const perFeedCap =
      topic === "european-leagues" && plFeed
        ? 6
        : topic === "european-leagues" && leagueFeed
          ? 5
          : 25;

    return (result.items ?? [])
      .slice(0, perFeedCap)
      .filter((item) => {
        const title = item.title ?? "";
        const description = stripHtml(item.contentSnippet ?? item.content ?? item.summary ?? "");
        if (topic === "transfers") return isTransferArticle(title, description);
        if (topic === "kenyan-football") return isKenyanFootballArticle(title, description);
        if (plFeed && topic === "premier-league") return !isExcludedSport(title, description);
        if (leagueFeed && isLeagueSlug(topic)) {
          return (
            !isExcludedSport(title, description) &&
            matchesLeagueArticle(title, description, topic)
          );
        }
        if (leagueFeed && topic === "european-leagues") {
          return (
            !isExcludedSport(title, description) &&
            matchesEuropeanLeagues(title, description)
          );
        }
        if (leagueFeed) return !isExcludedSport(title, description);
        return matchesTopic(title, description, topic);
      })
      .map((item) => {
        const link = item.link ?? item.guid ?? "#";
        const raw = item as unknown as Record<string, unknown>;
        const description = stripHtml(
          item.contentSnippet ?? item.content ?? item.summary ?? ""
        );
        const feedContent = stripHtml(
          String(raw["content:encoded"] ?? item.content ?? item.summary ?? "")
        );
        return makeArticle({
          title: item.title ?? "Untitled",
          description: description.slice(0, 500),
          content:
            feedContent.length > description.length && feedContent.length >= 180
              ? feedContent.slice(0, ARTICLE_CONTENT_MAX_CHARS)
              : undefined,
          link: typeof link === "string" ? link : "#",
          pubDate: normalizeDate(item.isoDate ?? item.pubDate),
          source: feed.source,
          image: extractImage(raw),
          videoUrl: extractVideo(raw),
        });
      });
  } catch (error) {
    console.error(`Failed RSS ${feed.source}:`, error);
    return [];
  }
}

async function fetchYouTubeVideos(topic: NewsTopic): Promise<NewsArticle[]> {
  if (
    topic === "transfers" ||
    topic === "kenyan-football" ||
    (isLeagueSlug(topic) && topic !== "premier-league")
  ) {
    return [];
  }

  const settled = await Promise.allSettled(
    YOUTUBE_VIDEO_FEEDS.map(async (feed) => {
      const xml = await fetchText(feed.url);
      const result = await withTimeout(
        Promise.resolve(parser.parseString(xml)),
        FETCH_TIMEOUT_MS,
        `${feed.source} YouTube parse`
      );

      return (result.items ?? []).slice(0, 8).map((item) => {
        const link = String(item.link ?? item.guid ?? "");
        const itemId = String((item as { id?: string }).id ?? "");
        const videoId =
          link.match(/(?:v=|youtu\.be\/|\/shorts\/)([\w-]{11})/i)?.[1] ??
          itemId.match(/yt:video:([\w-]{11})/i)?.[1];
        const videoUrl = videoId
          ? `https://www.youtube.com/watch?v=${videoId}`
          : link.startsWith("http")
            ? link
            : undefined;
        const title = item.title ?? "Match video";
        const description = stripHtml(
          item.contentSnippet ?? item.content ?? item.summary ?? ""
        ).slice(0, 500);
        const raw = item as unknown as Record<string, unknown>;
        const image =
          extractImage(raw) ??
          (videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : undefined);

        return makeArticle({
          title,
          description: videoDescription(title, feed.source, description),
          link: link || videoUrl || "#",
          pubDate: normalizeDate(item.isoDate ?? item.pubDate),
          source: feed.source,
          image,
          videoUrl,
        });
      });
    })
  );

  const articles = settled.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );

  return articles.filter((article) => {
    if (!article.videoUrl) return false;
    return (
      !isExcludedSport(article.title, article.description) &&
      (isPremierLeagueArticle(article.title, article.description) ||
        looksLikeVideoStory(article.title, article.description) ||
        article.source.includes("Premier League") ||
        article.source.includes("Sky Sports"))
    );
  });
}

async function fetchFromRss(topic: NewsTopic): Promise<NewsArticle[]> {
  const feeds = feedsForTopic(topic);

  // RSS + YouTube in parallel for faster first paint.
  const [settled, youtube] = await Promise.all([
    Promise.allSettled(feeds.map((feed) => fetchFromRssFeed(feed, topic))),
    fetchYouTubeVideos(topic),
  ]);
  const rss = settled.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );
  // Text news first — YouTube clips stay available but never lead the home feed.
  return [...rss, ...youtube];
}

function preferArticlesWithImages(articles: NewsArticle[]): NewsArticle[] {
  return [...articles].sort((a, b) => {
    const score = (article: NewsArticle) => {
      const isVideo = Boolean(article.videoUrl);
      // Homepage top stories should be news, not video clips.
      if (isVideo) return isUsableNewsImage(article.image) ? -1 : -2;
      return (
        (isUsableNewsImage(article.image) ? 6 : 0) +
        (article.source === "Standard Sports" ||
        article.source.includes("BBC") ||
        article.source.includes("Guardian") ||
        article.source.includes("Sky Sports PL") ||
        article.source.startsWith("Google News")
          ? 1
          : 0)
      );
    };
    const scoreDifference = score(b) - score(a);
    if (scoreDifference) return scoreDifference;
    return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
  });
}

/** Map an article into a league bucket for the Europe home mix. */
function europeanLeagueBucket(article: NewsArticle): string {
  if (article.source.startsWith("Google News · ")) {
    return article.source.replace("Google News · ", "");
  }
  if (
    article.source.includes("PL") ||
    article.source.includes("Premier") ||
    article.source === "BBC Sport" ||
    article.source === "ESPN Soccer"
  ) {
    return "Premier League";
  }
  for (const league of LEAGUE_NEWS_CONFIG) {
    if (matchesLeagueArticle(article.title, article.description, league.slug)) {
      return league.name;
    }
  }
  return "Europe";
}

/**
 * Round-robin across leagues so homepage Europe news shows Premier League,
 * La Liga, Bundesliga, Serie A, etc. — not one publisher pile.
 */
function balanceEuropeanLeagueMix(articles: NewsArticle[]): NewsArticle[] {
  const buckets = new Map<string, NewsArticle[]>();
  for (const article of articles) {
    const key = europeanLeagueBucket(article);
    const list = buckets.get(key) ?? [];
    list.push(article);
    buckets.set(key, list);
  }

  for (const [key, list] of buckets) {
    buckets.set(key, preferArticlesWithImages(list));
  }

  const order = [
    ...LEAGUE_NEWS_CONFIG.map((league) => league.name),
    "Europe",
  ];
  const result: NewsArticle[] = [];
  const seen = new Set<string>();
  let added = true;

  while (added && result.length < NEWS_POOL_SIZE) {
    added = false;
    for (const key of order) {
      const list = buckets.get(key);
      if (!list?.length) continue;
      const next = list.shift()!;
      if (seen.has(next.id)) continue;
      seen.add(next.id);
      result.push(next);
      added = true;
    }
    for (const [key, list] of buckets) {
      if (order.includes(key) || !list.length) continue;
      const next = list.shift()!;
      if (seen.has(next.id)) continue;
      seen.add(next.id);
      result.push(next);
      added = true;
    }
  }

  return result;
}

export function hasGNewsApi(): boolean {
  return Boolean(process.env.GNEWS_API_KEY);
}

export function getActiveNewsSources(topic: NewsTopic = "all"): string[] {
  if (topic === "kenyan-football") {
    const sources = ["Standard Sports", "Google News Kenya"];
    if (process.env.GNEWS_API_KEY) sources.unshift("GNews Kenya");
    return sources;
  }
  if (isLeagueSlug(topic)) {
    const sources = [leagueSourceLabel(topic)];
    if (topic === "premier-league") {
      sources.push(
        "Sky Sports PL",
        "Guardian PL",
        "BBC Sport",
        "ESPN Soccer"
      );
    }
    if (process.env.GNEWS_API_KEY) sources.unshift("GNews.io");
    return sources;
  }
  if (topic === "european-leagues") {
    const sources = LEAGUE_NEWS_CONFIG.map((league) => leagueSourceLabel(league.slug));
    if (process.env.GNEWS_API_KEY) sources.unshift("GNews.io");
    return sources;
  }
  if (topic === "transfers") {
    const sources = [
      "BBC Transfers",
      "Google News Transfers",
      "Sky Sports PL",
      "Guardian PL",
      "BBC Sport",
      "ESPN Soccer",
    ];
    if (process.env.GNEWS_API_KEY) sources.unshift("GNews.io");
    return sources;
  }
  const sources = [
    ...LEAGUE_NEWS_CONFIG.map((league) => leagueSourceLabel(league.slug)),
    "Sky Sports Football",
    "BBC Sport",
    "Standard Sports",
    "Google News Kenya",
  ];
  if (process.env.GNEWS_API_KEY) sources.unshift("GNews.io");
  return sources;
}

const europeanFallbackNews: NewsArticle[] = LEAGUE_NEWS_CONFIG.slice(0, 6).map(
  (league) =>
    makeArticle({
      title: `${league.name} — latest headlines`,
      description: `Breaking ${league.name} news from ${league.country}.`,
      link: `https://soccer.co.ke/news?topic=${league.slug}`,
      pubDate: new Date().toISOString(),
      source: leagueSourceLabel(league.slug),
    })
);

function fallbackForTopic(topic: NewsTopic): NewsArticle[] {
  if (topic === "transfers") return transferFallbackNews;
  if (topic === "kenyan-football") return kenyanFallbackNews;
  if (topic === "premier-league") return plFallbackNews;
  if (topic === "european-leagues") return europeanFallbackNews;
  if (isLeagueSlug(topic)) {
    const league = getLeagueConfig(topic);
    return [
      makeArticle({
        title: `${league.name} — latest headlines`,
        description: `Breaking ${league.name} news from ${league.country}.`,
        link: `https://soccer.co.ke/news?topic=${league.slug}`,
        pubDate: new Date().toISOString(),
        source: leagueSourceLabel(topic),
      }),
    ];
  }
  return allFallbackNews;
}

export async function getNews(
  limit = DEFAULT_LIMIT,
  topic: NewsTopic = "all"
): Promise<NewsArticle[]> {
  const snapshot = await getNewsSnapshot(limit, topic);
  return snapshot.articles;
}

function newestArticleDate(articles: NewsArticle[]): string | null {
  const newest = articles.reduce((latest, article) => {
    const timestamp = new Date(article.pubDate).getTime();
    return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest;
  }, 0);
  return newest > 0 ? new Date(newest).toISOString() : null;
}

function carryForwardImages(
  articles: NewsArticle[],
  previous?: NewsArticle[]
): NewsArticle[] {
  if (!previous?.length) return articles;
  const byId = new Map(
    previous
      .filter((article) => isUsableNewsImage(article.image))
      .map((article) => [article.id, article.image as string])
  );
  const byLink = new Map(
    previous
      .filter((article) => isUsableNewsImage(article.image))
      .map((article) => [article.link, article.image as string])
  );

  return articles.map((article) => {
    if (isUsableNewsImage(article.image)) return article;
    const image = byId.get(article.id) ?? byLink.get(article.link);
    return image ? { ...article, image } : article;
  });
}

function scheduleBackgroundImageEnrich(
  topic: NewsTopic,
  published: NewsCacheEntry,
  maxLookups: number
) {
  void (async () => {
    try {
      let enriched = await enrichArticleImages(published.articles, maxLookups);
      if (
        topic === "kenyan-football" ||
        topic === "european-leagues" ||
        topic === "premier-league" ||
        topic === "transfers"
      ) {
        enriched = preferArticlesWithImages(enriched);
      }

      const current = newsCache.get(topic);
      if (!current || current.fetchedAt !== published.fetchedAt) return;

      const nextArticles = enriched.slice(0, NEWS_POOL_SIZE);
      const nextImaged = nextArticles.filter((article) =>
        isUsableNewsImage(article.image)
      ).length;
      const publishedImaged = published.articles.filter((article) =>
        isUsableNewsImage(article.image)
      ).length;
      if (nextImaged <= publishedImaged) return;

      const updated: NewsCacheEntry = {
        ...current,
        articles: nextArticles,
        newestArticleAt: newestArticleDate(nextArticles),
      };
      newsCache.set(topic, updated);
      indexArticlesById(updated.articles);
    } catch {
      // Background enrich is best-effort.
    }
  })();
}

async function enrichArticleImages(
  articles: NewsArticle[],
  maxLookups = 12
): Promise<NewsArticle[]> {
  const missing = articles
    .map((article, index) => ({ article, index }))
    .filter(
      ({ article }) =>
        !isUsableNewsImage(article.image) && article.link.startsWith("http")
    )
    .slice(0, maxLookups);

  if (missing.length === 0) return articles;

  // Keep whatever image we already have — only fill gaps.
  const enriched = articles.map((article) => ({ ...article }));

  const run = async () => {
    const googleLinks = [
      ...new Set(
        missing
          .map(({ article }) => article.link)
          .filter((link) => link.includes("news.google.com"))
      ),
    ];
    const decodedByGoogleLink = new Map<string, string>();

    // Batch decode — one batchexecute POST instead of N individual RPCs (fewer 429s).
    if (googleLinks.length > 0) {
      try {
        type BatchDecodeRow = {
          status?: boolean;
          source_url?: string;
          decoded_url?: string;
        };
        const batch = (await getGoogleNewsDecoder().decodeBatch(
          googleLinks
        )) as BatchDecodeRow[];
        for (const row of batch) {
          if (
            row?.status &&
            typeof row.source_url === "string" &&
            typeof row.decoded_url === "string" &&
            row.decoded_url.startsWith("http") &&
            !row.decoded_url.includes("news.google.com")
          ) {
            decodedByGoogleLink.set(row.source_url, row.decoded_url);
            decodedGoogleNewsCache.set(row.source_url, {
              url: row.decoded_url,
              expiresAt: Date.now() + 24 * 60 * 60 * 1000,
            });
          }
        }
      } catch (error) {
        console.warn("Google News decodeBatch failed:", error);
      }
    }

    // Fill any remaining Google links one-by-one (cached / softer path).
    await Promise.allSettled(
      googleLinks
        .filter((link) => !decodedByGoogleLink.has(link))
        .map(async (link) => {
          const decoded = await decodeGoogleNewsLink(link);
          if (decoded && !decoded.includes("news.google.com")) {
            decodedByGoogleLink.set(link, decoded);
          }
        })
    );

    await Promise.allSettled(
      missing.map(async ({ article, index }) => {
        const resolved =
          decodedByGoogleLink.get(article.link) ??
          (await resolveArticleLink(article.link));

        if (resolved.includes("news.google.com")) return;

        const details = await fetchPublisherDetails(article.link, resolved);
        if (!isUsableNewsImage(details.image)) return;
        enriched[index] = { ...article, image: details.image };
      })
    );

    return enriched;
  };

  return withSoftTimeout(run(), IMAGE_ENRICH_BUDGET_MS, enriched);
}

/**
 * Resolve a usable thumbnail for one article link (used by the inbuilt
 * news image loader when RSS/GNews did not provide an image).
 */
export async function resolveNewsArticleImage(
  link: string,
  existing?: string
): Promise<string | undefined> {
  if (isUsableNewsImage(existing)) return existing;
  if (!link.startsWith("http")) return undefined;

  const cachedDetails = articleDetailsCache.get(link);
  if (cachedDetails && cachedDetails.expiresAt > Date.now()) {
    if (isUsableNewsImage(cachedDetails.image)) return cachedDetails.image;
  }

  const resolved = await resolveArticleLink(link);
  if (resolved.includes("news.google.com")) return undefined;

  const details = await fetchPublisherDetails(link, resolved);
  return isUsableNewsImage(details.image) ? details.image : undefined;
}

/** Persist a newly resolved image onto the in-memory article caches. */
export function attachResolvedArticleImage(
  articleId: string | undefined,
  link: string,
  image: string
) {
  if (!isUsableNewsImage(image)) return;

  if (articleId) {
    const hit = articleByIdCache.get(articleId);
    if (hit) {
      articleByIdCache.set(articleId, {
        article: { ...hit.article, image },
        expiresAt: Math.max(hit.expiresAt, Date.now() + 10 * 60 * 1000),
      });
    }
  }

  for (const [topic, entry] of newsCache) {
    let changed = false;
    const articles = entry.articles.map((article) => {
      if (article.image) return article;
      if (articleId && article.id === articleId) {
        changed = true;
        return { ...article, image };
      }
      if (article.link === link) {
        changed = true;
        return { ...article, image };
      }
      return article;
    });
    if (changed) {
      newsCache.set(topic, { ...entry, articles });
    }
  }
}

async function refreshNews(topic: NewsTopic): Promise<NewsCacheEntry> {
  const existingRefresh = newsRefreshes.get(topic);
  if (existingRefresh) return existingRefresh;

  const refresh = (async () => {
    const previous = newsCache.get(topic);

    try {
      const [rss, gnews] = await Promise.all([
        fetchFromRss(topic),
        fetchFromGNews(10, topic),
      ]);

      let merged = dedupeArticles(
        [...gnews, ...rss].sort((a, b) => {
          const reportScore = (article: NewsArticle) => {
            if (article.content && article.content.length >= 180) return 3;
            if (article.description.length >= 120) return 2;
            if (article.description.length >= 50) return 1;
            return 0;
          };
          const dateDifference =
            new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
          return dateDifference || reportScore(b) - reportScore(a);
        })
      );

      if (topic === "premier-league") {
        merged = merged.filter(
          (a) =>
            a.videoUrl ||
            isPremierLeagueArticle(a.title, a.description)
        );
      }
      if (isLeagueSlug(topic) && topic !== "premier-league") {
        merged = merged.filter((a) =>
          matchesLeagueArticle(a.title, a.description, topic)
        );
      }
      if (topic === "european-leagues") {
        merged = merged.filter((a) =>
          matchesEuropeanLeagues(a.title, a.description)
        );
      }
      if (topic === "kenyan-football") {
        merged = merged.filter(
          (a) =>
            isKenyanFootballArticle(a.title, a.description) &&
            (a.source === "Standard Sports" ||
              a.source.startsWith("Google News") ||
              a.source.startsWith("GNews") ||
              isLikelyKenyanPublisher(a.source))
        );

        const standardWithImages = merged.filter(
          (a) => a.source === "Standard Sports" && isUsableNewsImage(a.image)
        );
        const rest = merged.filter(
          (a) => a.source !== "Standard Sports" || !isUsableNewsImage(a.image)
        );

        merged = [...standardWithImages, ...rest];
      }
      if (topic === "transfers") {
        merged = merged.filter((a) => isTransferArticle(a.title, a.description));
      }

      // Ensure posters for YouTube / Dailymotion cards
      merged = merged.map((article) => {
        if (!article.videoUrl) return article;
        const poster = videoPosterUrl(article.videoUrl, article.image);
        if (!poster || poster === article.image) return article;
        return { ...article, image: poster };
      });

      // Reuse thumbnails from the previous healthy snapshot when a refresh
      // temporarily fails to scrape og:image (common for Google News links).
      merged = carryForwardImages(merged, previous?.articles);

      // Rank with whatever images we already have (RSS/GNews/YouTube/carry-forward).
      // Publisher og:image scrapes run in the background after we publish.
      // Europe: round-robin leagues so home isn't all Premier League RSS.
      if (topic === "european-leagues") {
        merged = balanceEuropeanLeagueMix(merged);
      } else if (
        topic === "kenyan-football" ||
        topic === "premier-league" ||
        topic === "transfers"
      ) {
        merged = preferArticlesWithImages(merged);
      }

      if (merged.length === 0) {
        if (previous && !previous.isFallback && previous.articles.length > 0) {
          return {
            ...previous,
            failedSources: getActiveNewsSources(topic),
            degraded: true,
            expiresAt: Date.now() + RETRY_CACHE_TTL_MS,
          };
        }

        const fallback = fallbackForTopic(topic).slice(0, NEWS_POOL_SIZE);
        return {
          articles: fallback,
          fetchedAt: new Date().toISOString(),
          newestArticleAt: newestArticleDate(fallback),
          successfulSources: [],
          failedSources: getActiveNewsSources(topic),
          isFallback: true,
          degraded: true,
          expiresAt: Date.now() + RETRY_CACHE_TTL_MS,
        };
      }

      const articles = merged.slice(0, NEWS_POOL_SIZE);
      const successfulSources = [...new Set(articles.map((article) => article.source))];
      const configuredSources = getActiveNewsSources(topic);
      const failedSources = configuredSources.filter(
        (source) =>
          !successfulSources.some(
            (active) => active === source || active.startsWith(`${source} ·`)
          )
      );

      // If this refresh lost every thumbnail but the previous snapshot was healthy,
      // keep the previous feed rather than blanking the homepage images.
      const imagedCount = articles.filter((article) =>
        isUsableNewsImage(article.image)
      ).length;
      const previousImaged =
        previous?.articles.filter((article) =>
          isUsableNewsImage(article.image)
        ).length ?? 0;
      if (
        imagedCount === 0 &&
        previous &&
        !previous.isFallback &&
        previousImaged >= 3
      ) {
        return {
          ...previous,
          expiresAt: Date.now() + RETRY_CACHE_TTL_MS,
          degraded: true,
        };
      }

      const entry: NewsCacheEntry = {
        articles,
        fetchedAt: new Date().toISOString(),
        newestArticleAt: newestArticleDate(articles),
        successfulSources,
        failedSources,
        isFallback: false,
        degraded: false,
        expiresAt: Date.now() + CACHE_TTL_MS,
      };

      newsCache.set(topic, entry);
      indexArticlesById(entry.articles);

      // Fill missing thumbnails after first paint — do not block TTFB.
      const enrichLookups =
        topic === "kenyan-football" || topic === "european-leagues" ? 12 : 8;
      scheduleBackgroundImageEnrich(topic, entry, enrichLookups);

      return entry;
    } catch {
      if (previous && previous.articles.length > 0) {
        return {
          ...previous,
          degraded: true,
          expiresAt: Date.now() + RETRY_CACHE_TTL_MS,
        };
      }

      const fallback = fallbackForTopic(topic).slice(0, NEWS_POOL_SIZE);
      return {
        articles: fallback,
        fetchedAt: new Date().toISOString(),
        newestArticleAt: newestArticleDate(fallback),
        successfulSources: [],
        failedSources: getActiveNewsSources(topic),
        isFallback: true,
        degraded: true,
        expiresAt: Date.now() + RETRY_CACHE_TTL_MS,
      };
    }
  })();

  newsRefreshes.set(topic, refresh);
  try {
    const entry = await refresh;
    newsCache.set(topic, entry);
    indexArticlesById(entry.articles);
    return entry;
  } finally {
    newsRefreshes.delete(topic);
  }
}

export async function getNewsSnapshot(
  limit = DEFAULT_LIMIT,
  topic: NewsTopic = "all"
): Promise<NewsSnapshot> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || DEFAULT_LIMIT, 1), 50);
  const cached = newsCache.get(topic);

  const toSnapshot = (entry: NewsCacheEntry): NewsSnapshot => {
    const editorial = getPublishedAdminNews(topic);
    const merged = dedupeArticles([...editorial, ...entry.articles]);
    return {
      articles: merged.slice(0, safeLimit),
      fetchedAt: entry.fetchedAt,
      newestArticleAt: newestArticleDate(merged),
      successfulSources: entry.successfulSources,
      failedSources: entry.failedSources,
      isFallback: entry.isFallback,
      degraded: entry.degraded,
    };
  };

  // Fresh cache — return immediately.
  if (cached && cached.expiresAt > Date.now()) {
    return toSnapshot(cached);
  }

  // Stale-while-revalidate — avoid Cloudflare 522 by never blocking on a slow refresh.
  // Keep the existing degraded/isFallback flags; do not mark healthy cache as degraded
  // just because a background refresh is in flight (that caused a false warning banner).
  if (cached && cached.articles.length > 0) {
    void refreshNews(topic);
    return toSnapshot(cached);
  }

  // Cold start — race refresh against a budget, then serve fallback.
  try {
    const entry = await Promise.race([
      refreshNews(topic),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("news-refresh-timeout")), NEWS_REFRESH_BUDGET_MS);
      }),
    ]);
    return toSnapshot(entry);
  } catch {
    const editorial = getPublishedAdminNews(topic);
    const fallback = dedupeArticles([
      ...editorial,
      ...fallbackForTopic(topic),
    ]).slice(0, safeLimit);
    return {
      articles: fallback,
      fetchedAt: new Date().toISOString(),
      newestArticleAt: newestArticleDate(fallback),
      successfulSources: [],
      failedSources: getActiveNewsSources(topic),
      isFallback: true,
      degraded: true,
    };
  }
}

function findCachedArticleById(id: string): NewsArticle | null {
  const direct = articleByIdCache.get(id);
  if (direct && direct.expiresAt > Date.now()) return direct.article;

  for (const entry of newsCache.values()) {
    const match = entry.articles.find((article) => article.id === id);
    if (match) return match;
  }
  return null;
}

async function withSoftTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function indexArticlesById(articles: NewsArticle[]) {
  const expiresAt = Date.now() + 15 * 60 * 1000;
  for (const article of articles) {
    const existing = articleByIdCache.get(article.id);
    // Never overwrite id → different story (hash collision / stale map).
    if (
      existing &&
      existing.expiresAt > Date.now() &&
      canonicalArticleLink(existing.article.link) !==
        canonicalArticleLink(article.link)
    ) {
      continue;
    }
    articleByIdCache.set(article.id, { article, expiresAt });
  }
}

export async function getNewsArticleById(id: string): Promise<NewsArticle | null> {
  const safeId = decodeURIComponent(id).trim();
  if (!safeId) return null;

  const adminId = parseAdminPostNewsId(safeId);
  if (adminId) {
    const post = getAdminPost(adminId);
    if (post?.status === "published") {
      return adminPostToNewsArticle(post);
    }
  }

  const cachedHit = findCachedArticleById(safeId);
  let found = cachedHit;

  if (!found) {
    const topics: NewsTopic[] = [
      "european-leagues",
      "premier-league",
      "kenyan-football",
      "transfers",
      "all",
      ...LEAGUE_SLUGS,
    ];

    // Search full in-memory pools first (not just the truncated page slice).
    for (const topic of topics) {
      const entry = newsCache.get(topic);
      if (!entry) continue;
      const match = entry.articles.find((article) => article.id === safeId);
      if (match) {
        found = match;
        break;
      }
    }

    if (!found) {
      for (const topic of topics) {
        const snapshot = await getNewsSnapshot(NEWS_POOL_SIZE, topic);
        indexArticlesById(snapshot.articles);
        const match = snapshot.articles.find((article) => article.id === safeId);
        if (match) {
          found = match;
          break;
        }
      }
    }
  }

  if (!found) return null;

  const isGoogleLink = found.link.includes("news.google.com");
  const imageTrusted = isUsableNewsImage(found.image) && !isGoogleLink;
  const needsEnrichment = !(found.content && imageTrusted);

  const details = needsEnrichment
    ? await withSoftTimeout(
        fetchPublisherDetails(found.link),
        2500,
        {} as { content?: string; videoUrl?: string; image?: string }
      )
    : {};

  const image = isGoogleLink
    ? isUsableNewsImage(details.image)
      ? details.image
      : isUsableNewsImage(found.image)
        ? found.image
        : undefined
    : isUsableNewsImage(found.image)
      ? found.image
      : details.image;

  const article: NewsArticle = {
    ...found,
    content: found.content ?? details.content,
    videoUrl: found.videoUrl ?? details.videoUrl,
    image,
  };

  articleByIdCache.set(safeId, {
    article,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  return article;
}
