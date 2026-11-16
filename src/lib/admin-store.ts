import { createHash, randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import {
  isLeagueSlug,
  isNewsTopic,
  type NewsTopic,
} from "@/lib/league-news-config";
import type { NewsArticle } from "@/lib/types";

export type AdminPostStatus = "draft" | "published";

export type AdminPost = {
  id: string;
  title: string;
  body: string;
  status: AdminPostStatus;
  /** News feed / category where this post should appear. */
  topic: NewsTopic;
  /** Public image URL (usually /api/admin/media/...). */
  image: string | null;
  author: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type AdminMediaAsset = {
  id: string;
  mime: string;
  /** Base64 payload without data: prefix */
  data: string;
  createdAt: string;
};

export type PageViewEvent = {
  id: string;
  path: string;
  referrer: string;
  userAgent: string;
  createdAt: string;
};

type AnalyticsDay = {
  date: string;
  views: number;
  paths: Record<string, number>;
  referrers: Record<string, number>;
  devices: { mobile: number; desktop: number; tablet: number; other: number };
};

type StoreShape = {
  posts: AdminPost[];
  media: Record<string, AdminMediaAsset>;
  analytics: {
    days: AnalyticsDay[];
    totalViews: number;
  };
};

const EMPTY_STORE: StoreShape = {
  posts: [],
  media: {},
  analytics: { days: [], totalViews: 0 },
};

const MAX_UPLOAD_BYTES = 1_800_000;

let memoryStore: StoreShape | null = null;

function dataDirCandidates(): string[] {
  const custom = process.env.ADMIN_DATA_DIR?.trim();
  return [
    ...(custom ? [custom] : []),
    join(process.cwd(), "data"),
    join("/tmp", "soccer-co-ke-data"),
  ];
}

function resolveDataFile(): string {
  for (const dir of dataDirCandidates()) {
    try {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      return join(dir, "admin-store.json");
    } catch {
      // try next
    }
  }
  return join(process.cwd(), "data", "admin-store.json");
}

function readStore(): StoreShape {
  if (memoryStore) return memoryStore;
  const file = resolveDataFile();
  try {
    if (existsSync(file)) {
      const parsed = JSON.parse(readFileSync(file, "utf8")) as StoreShape;
      memoryStore = {
        posts: Array.isArray(parsed.posts)
          ? parsed.posts.map(normalizeAdminPost)
          : [],
        media:
          parsed.media && typeof parsed.media === "object" ? parsed.media : {},
        analytics: {
          days: Array.isArray(parsed.analytics?.days) ? parsed.analytics.days : [],
          totalViews: Number(parsed.analytics?.totalViews) || 0,
        },
      };
      return memoryStore;
    }
  } catch {
    // fall through
  }
  memoryStore = structuredClone(EMPTY_STORE);
  return memoryStore;
}

function writeStore(store: StoreShape) {
  memoryStore = store;
  const file = resolveDataFile();
  try {
    writeFileSync(file, JSON.stringify(store, null, 2), "utf8");
  } catch (error) {
    console.error("admin-store write failed:", error);
  }
}

function dayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function normalizeAdminPost(raw: Partial<AdminPost> & { id: string }): AdminPost {
  const topic =
    raw.topic && isNewsTopic(raw.topic) ? raw.topic : "european-leagues";
  return {
    id: raw.id,
    title: raw.title ?? "Untitled",
    body: raw.body ?? "",
    status: raw.status === "draft" ? "draft" : "published",
    topic,
    image: raw.image?.trim() || null,
    author: raw.author ?? "Admin",
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? raw.createdAt ?? new Date().toISOString(),
    publishedAt: raw.publishedAt ?? null,
  };
}

export function adminPostNewsId(postId: string): string {
  return `admin-${postId}`;
}

export function parseAdminPostNewsId(id: string): string | null {
  if (!id.startsWith("admin-")) return null;
  return id.slice("admin-".length) || null;
}

export function adminPostMatchesTopic(post: AdminPost, topic: NewsTopic): boolean {
  if (post.status !== "published") return false;
  if (topic === "all") return true;
  if (post.topic === topic) return true;
  // Home / Europe feed also includes posts aimed at a specific European league.
  if (topic === "european-leagues") {
    return post.topic === "european-leagues" || isLeagueSlug(post.topic);
  }
  return false;
}

export function adminPostToNewsArticle(post: AdminPost): NewsArticle {
  const description = post.body.replace(/\s+/g, " ").trim().slice(0, 280);
  return {
    id: adminPostNewsId(post.id),
    title: post.title,
    description,
    content: post.body,
    link: `/news/${adminPostNewsId(post.id)}`,
    pubDate: post.publishedAt ?? post.createdAt,
    source: "soccer.co.ke",
    image: post.image || undefined,
  };
}

export function saveAdminMedia(input: {
  mime: string;
  bytes: Buffer;
}): { id: string; url: string } {
  if (input.bytes.length > MAX_UPLOAD_BYTES) {
    throw new Error("Image is too large. Use a file under 1.8MB.");
  }
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(input.mime)) {
    throw new Error("Only JPG, PNG, WEBP, or GIF images are allowed.");
  }
  const store = readStore();
  const id = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
  store.media[id] = {
    id,
    mime: input.mime,
    data: input.bytes.toString("base64"),
    createdAt: new Date().toISOString(),
  };
  writeStore(store);
  return { id, url: `/api/admin/media/${id}` };
}

export function getAdminMedia(id: string): AdminMediaAsset | null {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safe) return null;
  return readStore().media[safe] ?? null;
}

export function getPublishedAdminNews(topic: NewsTopic): NewsArticle[] {
  return listAdminPosts({ status: "published" })
    .filter((post) => adminPostMatchesTopic(post, topic))
    .map(adminPostToNewsArticle);
}

function detectDevice(userAgent: string): keyof AnalyticsDay["devices"] {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet/.test(ua)) return "tablet";
  if (/mobi|iphone|android/.test(ua)) return "mobile";
  if (/windows|macintosh|linux|cros/.test(ua)) return "desktop";
  return "other";
}

function cleanPath(raw: string): string {
  try {
    const url = new URL(raw, "https://soccer.co.ke");
    const path = url.pathname || "/";
    if (path.startsWith("/admin") || path.startsWith("/api")) return "";
    return path.length > 180 ? path.slice(0, 180) : path;
  } catch {
    return "";
  }
}

function cleanReferrer(raw: string): string {
  if (!raw) return "direct";
  try {
    const url = new URL(raw);
    if (url.hostname.includes("soccer.co.ke") || url.hostname.includes("vercel.app")) {
      return "direct";
    }
    return url.hostname.replace(/^www\./, "") || "direct";
  } catch {
    return "direct";
  }
}

export function listAdminPosts(options?: {
  status?: AdminPostStatus | "all";
}): AdminPost[] {
  const store = readStore();
  const status = options?.status ?? "all";
  const posts =
    status === "all"
      ? store.posts
      : store.posts.filter((post) => post.status === status);
  return [...posts].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getAdminPost(id: string): AdminPost | null {
  return readStore().posts.find((post) => post.id === id) ?? null;
}

export function createAdminPost(input: {
  title: string;
  body: string;
  status: AdminPostStatus;
  topic?: NewsTopic;
  author?: string;
  image?: string | null;
}): AdminPost {
  const store = readStore();
  const now = new Date().toISOString();
  const topic =
    input.topic && isNewsTopic(input.topic) ? input.topic : "european-leagues";
  const post: AdminPost = {
    id: randomUUID(),
    title: input.title.trim(),
    body: input.body.trim(),
    status: input.status,
    topic,
    image: input.image?.trim() || null,
    author: (input.author || "Admin").trim() || "Admin",
    createdAt: now,
    updatedAt: now,
    publishedAt: input.status === "published" ? now : null,
  };
  store.posts.unshift(post);
  writeStore(store);
  return post;
}

export function updateAdminPost(
  id: string,
  input: Partial<
    Pick<AdminPost, "title" | "body" | "status" | "author" | "topic" | "image">
  >
): AdminPost | null {
  const store = readStore();
  const index = store.posts.findIndex((post) => post.id === id);
  if (index < 0) return null;
  const current = store.posts[index];
  const nextStatus = input.status ?? current.status;
  const now = new Date().toISOString();
  const topic =
    input.topic && isNewsTopic(input.topic) ? input.topic : current.topic;
  const updated: AdminPost = {
    ...current,
    title: input.title?.trim() ?? current.title,
    body: input.body?.trim() ?? current.body,
    author: input.author?.trim() || current.author,
    topic,
    image:
      input.image === undefined
        ? current.image
        : input.image?.trim() || null,
    status: nextStatus,
    updatedAt: now,
    publishedAt:
      nextStatus === "published"
        ? current.publishedAt ?? now
        : current.publishedAt,
  };
  store.posts[index] = updated;
  writeStore(store);
  return updated;
}

export function deleteAdminPost(id: string): boolean {
  const store = readStore();
  const next = store.posts.filter((post) => post.id !== id);
  if (next.length === store.posts.length) return false;
  store.posts = next;
  writeStore(store);
  return true;
}

export function recordPageView(input: {
  path: string;
  referrer?: string;
  userAgent?: string;
}): boolean {
  const path = cleanPath(input.path);
  if (!path) return false;

  const store = readStore();
  const date = dayKey();
  let day = store.analytics.days.find((entry) => entry.date === date);
  if (!day) {
    day = {
      date,
      views: 0,
      paths: {},
      referrers: {},
      devices: { mobile: 0, desktop: 0, tablet: 0, other: 0 },
    };
    store.analytics.days.push(day);
  }

  day.views += 1;
  day.paths[path] = (day.paths[path] ?? 0) + 1;
  const referrer = cleanReferrer(input.referrer ?? "");
  day.referrers[referrer] = (day.referrers[referrer] ?? 0) + 1;
  const device = detectDevice(input.userAgent ?? "");
  day.devices[device] += 1;
  store.analytics.totalViews += 1;

  // Keep ~90 days of daily rollups.
  store.analytics.days = store.analytics.days
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-90);

  writeStore(store);
  return true;
}

export type GrowthSnapshot = {
  totalViews: number;
  today: number;
  last7Days: number;
  last30Days: number;
  series: Array<{ date: string; views: number }>;
  topPages: Array<{ path: string; views: number }>;
  topReferrers: Array<{ source: string; views: number }>;
  devices: AnalyticsDay["devices"];
  publishedPosts: number;
  draftPosts: number;
};

function sumDays(days: AnalyticsDay[], fromDate: string): number {
  return days
    .filter((day) => day.date >= fromDate)
    .reduce((sum, day) => sum + day.views, 0);
}

function daysAgoKey(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return dayKey(date);
}

export function getGrowthSnapshot(): GrowthSnapshot {
  const store = readStore();
  const days = store.analytics.days;
  const today = dayKey();
  const last14Start = daysAgoKey(13);

  const seriesMap = new Map<string, number>();
  for (let i = 13; i >= 0; i -= 1) {
    seriesMap.set(daysAgoKey(i), 0);
  }
  for (const day of days) {
    if (day.date >= last14Start) seriesMap.set(day.date, day.views);
  }

  const pageTotals = new Map<string, number>();
  const referrerTotals = new Map<string, number>();
  const devices = { mobile: 0, desktop: 0, tablet: 0, other: 0 };
  const since30 = daysAgoKey(29);

  for (const day of days) {
    if (day.date < since30) continue;
    for (const [path, count] of Object.entries(day.paths)) {
      pageTotals.set(path, (pageTotals.get(path) ?? 0) + count);
    }
    for (const [source, count] of Object.entries(day.referrers)) {
      referrerTotals.set(source, (referrerTotals.get(source) ?? 0) + count);
    }
    devices.mobile += day.devices.mobile;
    devices.desktop += day.devices.desktop;
    devices.tablet += day.devices.tablet;
    devices.other += day.devices.other;
  }

  const topPages = [...pageTotals.entries()]
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);
  const topReferrers = [...referrerTotals.entries()]
    .map(([source, views]) => ({ source, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  return {
    totalViews: store.analytics.totalViews,
    today: days.find((day) => day.date === today)?.views ?? 0,
    last7Days: sumDays(days, daysAgoKey(6)),
    last30Days: sumDays(days, since30),
    series: [...seriesMap.entries()].map(([date, views]) => ({ date, views })),
    topPages,
    topReferrers,
    devices,
    publishedPosts: store.posts.filter((p) => p.status === "published").length,
    draftPosts: store.posts.filter((p) => p.status === "draft").length,
  };
}

export function visitorFingerprint(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 16);
}
