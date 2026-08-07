import Parser from "rss-parser";
import { GoogleDecoder } from "google-news-url-decoder";
import {
  ALL_NEWS_TOPICS,
  getLeagueConfig,
  isLeagueSlug,
  LEAGUE_NEWS_CONFIG,
  leagueRssFeeds,
  leagueSourceLabel,
  matchesEuropeanLeagues,
  matchesLeagueArticle,
  type LeagueSlug,
  type NewsTopic,
} from "./league-news-config";
import type { NewsArticle } from "./types";
import {
  extractVideoUrlFromHtml,
  isLikelyVideoUrl,
  looksLikeVideoStory,
  videoDescription,
  videoPosterUrl,
} from "./news-video";
import { articleIdFromLink } from "./utils";


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

const FETCH_TIMEOUT_MS = 6000;
const DEFAULT_LIMIT = 24;
const CACHE_TTL_MS = 2 * 60 * 1000;
const RETRY_CACHE_TTL_MS = 30 * 1000;
const NEWS_POOL_SIZE = 50;
const ARTICLE_CONTENT_MAX_CHARS = 20_000;

type NewsCacheEntry = NewsSnapshot & { expiresAt: number };

const newsCache = new Map<NewsTopic, NewsCacheEntry>();
const newsRefreshes = new Map<NewsTopic, Promise<NewsCacheEntry>>();
const articleDetailsCache = new Map<
  string,
  { content?: string; videoUrl?: string; image?: string; expiresAt: number }
>();
const decodedGoogleNewsCache = new Map<string, { url: string; expiresAt: number }>();

let googleNewsDecoder: GoogleDecoder | null = null;

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
    url: "https://news.google.com/rss/search?q=%22Kenya%20football%22%20OR%20%22Harambee%20Stars%22%20OR%20%22Gor%20Mahia%22%20OR%20%22AFC%20Leopards%22&hl=en-KE&gl=KE&ceid=KE%3Aen",
    source: "Google News Kenya",
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
  "kenyans",
  "kenya football",
  "kenyan football",
  "harambee stars",
  "harambee starlets",
  "junior starlets",
  "fkf",
  "kenya premier league",
  "kpl",
  "gor mahia",
  "afc leopards",
  "tusker fc",
  "tusker ",
  "bandari fc",
  "kcb fc",
  "mathare united",
  "kenya police fc",
  "sofapaka",
  "victor wanyama",
  "michael olunga",
  "kenya national team",
  "kenya women football",
  "kenya vs",
  "kenya cup football",
  "nyayo national stadium",
  "kasarani",
  "moi international sports centre",
  "fkf premier league",
  "sportpesa premier league",
  "kenya federation",
  "kenya qualifiers",
  "kenya world cup",
];

const TRANSFER_KEYWORDS = [
  "transfer",
  "signing",
  "signed",
  "signs",
  "loan",
  "deal",
  "joins",
  "joined",
  "move",
  "bid",
  "offer",
  "fee",
  "rumour",
  "rumor",
  "linked with",
  "interest in",
  "close to",
  "agree",
  "agrees",
  "confirmed",
  "unveils",
  "unveil",
  "new signing",
  "deadline day",
  "transfer window",
  "medical",
];

function makeArticle(
  partial: Omit<NewsArticle, "id"> & { id?: string }
): NewsArticle {
  return {
    ...partial,
    id: partial.id ?? articleIdFromLink(partial.link),
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
      url.search = "";
      linkKey = url.toString().replace(/\/$/, "");
    } catch {
      // Keep title-based deduplication for malformed or relative links.
    }

    if (
      (titleKey && seenTitles.has(titleKey)) ||
      (linkKey && seenLinks.has(linkKey))
    ) {
      return false;
    }
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

function findJsonLdImage(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const image = findJsonLdImage(item);
      if (image) return image;
    }
    return undefined;
  }

  const object = value as Record<string, unknown>;
  const image = object.image;
  if (typeof image === "string" && image.startsWith("http")) return image;
  if (Array.isArray(image)) {
    for (const item of image) {
      if (typeof item === "string" && item.startsWith("http")) return item;
      if (item && typeof item === "object") {
        const url = (item as { url?: string }).url;
        if (url?.startsWith("http")) return url;
      }
    }
  }
  if (image && typeof image === "object") {
    const url = (image as { url?: string }).url;
    if (url?.startsWith("http")) return url;
  }

  for (const nested of Object.values(object)) {
    const found = findJsonLdImage(nested);
    if (found) return found;
  }
  return undefined;
}

function extractOgImageFromHtml(html: string): string | undefined {
  const patterns = [
    /property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*property=["']og:image(?::secure_url)?["']/i,
    /property=["']og:image(?::secure_url)?["'][\s\S]*?content=["']([^"']+)["']/i,
    /name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*name=["']twitter:image(?::src)?["']/i,
    /name=["']twitter:image(?::src)?["'][\s\S]*?content=["']([^"']+)["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const candidate = match?.[1] ? decodeHtmlEntities(match[1].trim()) : "";
    if (candidate.startsWith("http")) return candidate;
  }

  const scripts = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const match of scripts) {
    try {
      const image = findJsonLdImage(JSON.parse(match[1]));
      if (image) return image;
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }

  return undefined;
}

function extractImage(item: Record<string, unknown>): string | undefined {
  for (const media of asMediaList(item.mediaContent)) {
    const url = media.$?.url;
    const type = media.$?.type;
    const medium = media.$?.medium;
    if (!url?.startsWith("http")) continue;
    if (medium === "video" || isLikelyVideoUrl(url, type)) continue;
    return url;
  }

  const mediaThumbnail = item.mediaThumbnail as
    | { $?: { url?: string } }
    | Array<{ $?: { url?: string } }>
    | undefined;
  if (Array.isArray(mediaThumbnail)) {
    const thumb = mediaThumbnail.find((t) => t.$?.url?.startsWith("http"));
    if (thumb?.$?.url) return thumb.$.url;
  } else if (mediaThumbnail?.$?.url) {
    return mediaThumbnail.$.url;
  }

  const group = item.mediaGroup as Record<string, unknown> | undefined;
  if (group) {
    for (const thumb of asMediaList(group["media:thumbnail"] ?? group.mediaThumbnail)) {
      if (thumb.$?.url?.startsWith("http")) return thumb.$.url;
    }
  }

  const enclosure = item.enclosure as { url?: string; type?: string } | undefined;
  if (
    enclosure?.url?.startsWith("http") &&
    !isLikelyVideoUrl(enclosure.url, enclosure.type)
  ) {
    return enclosure.url;
  }

  const content = String(item.content ?? item["content:encoded"] ?? item.summary ?? "");
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch?.[1]?.startsWith("http")) return imgMatch[1];

  const ogImage = extractOgImageFromHtml(content);
  if (ogImage) return ogImage;

  return undefined;
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
  return Boolean(url?.startsWith("http") && !isGenericNewsImage(url));
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
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(publisherUrl, {
      next: { revalidate: 600 },
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; soccer.co.ke/1.0; +https://soccer.co.ke)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!res.ok) return {};
    const html = (await res.text()).slice(0, 750_000);
    const details = {
      content: extractPublisherContent(html),
      videoUrl: extractVideoUrlFromHtml(html),
      image: extractOgImageFromHtml(html),
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
  if (
    text.includes("rugby") &&
    !text.includes("football") &&
    !text.includes("soccer")
  ) {
    return false;
  }

  if (KENYAN_FOOTBALL_KEYWORDS.some((kw) => text.includes(kw))) return true;

  const hasKenya =
    text.includes("kenya") || text.includes("harambee") || text.includes("fkf");
  const hasFootball =
    text.includes("football") ||
    text.includes("soccer") ||
    text.includes("fifa") ||
    text.includes("caf") ||
    text.includes("world cup");

  return hasKenya && hasFootball;
}

function isLikelyKenyanPublisher(source: string): boolean {
  const text = source.toLowerCase();
  return /kenya|harambee|gor|leopard|kpl|fkf|mozzart|pulse|standard|citizen|nation|kbc|sportpesa|capital fm|the-star|tuko|mpasho/i.test(
    text
  );
}

export function isTransferArticle(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  if (isExcludedSport(title, description)) return false;
  const hasTransfer = TRANSFER_KEYWORDS.some((kw) => text.includes(kw));
  if (!hasTransfer) return false;
  // Prefer PL clubs / league context; still allow pure transfer headlines
  return (
    isPremierLeagueArticle(title, description) ||
    text.includes("premier league") ||
    text.includes("football") ||
    text.includes("soccer")
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
  if (topic === "premier-league" || topic === "transfers") return PL_RSS_FEEDS;
  if (isLeagueSlug(topic)) {
    const league = getLeagueConfig(topic);
    return [{ url: league.googleNewsRss, source: leagueSourceLabel(topic) }];
  }
  if (topic === "european-leagues") {
    return leagueRssFeeds().map(({ url, source }) => ({ url, source }));
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
      // GNews free plans are quota-limited and delayed; use it as enrichment
      // while the RSS feeds provide the two-minute breaking-news refresh.
      next: { revalidate: 1800 },
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error(`GNews API error: ${res.status}`);
      return [];
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

    return (data.articles ?? [])
      .filter((item) =>
        matchesTopic(item.title, item.description ?? "", topic)
      )
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
  } catch (error) {
    console.error("GNews fetch failed:", error);
    return [];
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

    return (result.items ?? [])
      .slice(0, 25)
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
          (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined);

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
  const settled = await Promise.allSettled(
    feeds.map((feed) => fetchFromRssFeed(feed, topic))
  );
  const rss = settled.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );
  const youtube = await fetchYouTubeVideos(topic);
  return [...youtube, ...rss];
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
    const sources = ["Sky Sports PL", "Guardian PL", "BBC Sport", "ESPN Soccer"];
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

  const enriched = articles.map((article) =>
    isUsableNewsImage(article.image)
      ? article
      : { ...article, image: undefined }
  );

  const googleLinks = missing
    .map(({ article }) => article.link)
    .filter((link) => link.includes("news.google.com"));
  const decodedByGoogleLink = new Map<string, string>();

  if (googleLinks.length > 0) {
    try {
      const results = await getGoogleNewsDecoder().decodeBatch(googleLinks);
      googleLinks.forEach((link, index) => {
        const decoded = results[index];
        if (decoded?.status && decoded.decoded_url?.startsWith("http")) {
          decodedByGoogleLink.set(link, decoded.decoded_url);
          decodedGoogleNewsCache.set(link, {
            url: decoded.decoded_url,
            expiresAt: Date.now() + 24 * 60 * 60 * 1000,
          });
        }
      });
    } catch (error) {
      console.error("Google News batch decode failed:", error);
    }
  }

  await Promise.allSettled(
    missing.map(async ({ article, index }) => {
      const resolved =
        decodedByGoogleLink.get(article.link) ??
        (await resolveArticleLink(article.link));
      const details = await fetchPublisherDetails(
        article.link,
        resolved !== article.link ? resolved : undefined
      );
      if (!isUsableNewsImage(details.image)) return;
      enriched[index] = { ...article, image: details.image };
    })
  );

  return enriched;
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
              a.source === "Google News Kenya" ||
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

      merged = await enrichArticleImages(
        merged,
        topic === "kenyan-football" ? 24 : topic === "european-leagues" ? 18 : 12
      );

      if (topic === "kenyan-football") {
        merged.sort((a, b) => {
          const score = (article: NewsArticle) =>
            (isUsableNewsImage(article.image) ? 2 : 0) +
            (article.source === "Standard Sports" ? 1 : 0);
          const scoreDifference = score(b) - score(a);
          const dateDifference =
            new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
          return scoreDifference || dateDifference;
        });
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

      return {
        articles,
        fetchedAt: new Date().toISOString(),
        newestArticleAt: newestArticleDate(articles),
        successfulSources,
        failedSources,
        isFallback: false,
        degraded: false,
        expiresAt: Date.now() + CACHE_TTL_MS,
      };
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
  const entry =
    cached && cached.expiresAt > Date.now() ? cached : await refreshNews(topic);

  return {
    articles: entry.articles.slice(0, safeLimit),
    fetchedAt: entry.fetchedAt,
    newestArticleAt: entry.newestArticleAt,
    successfulSources: entry.successfulSources,
    failedSources: entry.failedSources,
    isFallback: entry.isFallback,
    degraded: entry.degraded,
  };
}

export async function getNewsArticleById(id: string): Promise<NewsArticle | null> {
  const topics: NewsTopic[] = [
    "european-leagues",
    "premier-league",
    "kenyan-football",
    "transfers",
    "all",
  ];

  let found: NewsArticle | null = null;
  for (const topic of topics) {
    const articles = await getNews(40, topic);
    const match = articles.find((article) => article.id === id);
    if (match) {
      found = match;
      break;
    }
  }

  if (!found) return null;

  const details =
    found.content && found.videoUrl && found.image
      ? {}
      : await fetchPublisherDetails(found.link);

  return {
    ...found,
    content: found.content ?? details.content,
    videoUrl: found.videoUrl ?? details.videoUrl,
    image: found.image ?? details.image,
  };
}
