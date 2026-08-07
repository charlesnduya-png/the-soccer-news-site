import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const routes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/news`, lastModified: now, changeFrequency: "hourly", priority: 0.95 },
    { url: `${SITE_URL}/kenya-football`, lastModified: now, changeFrequency: "hourly", priority: 0.93 },
    { url: `${SITE_URL}/kenya-football/teams`, lastModified: now, changeFrequency: "daily", priority: 0.86 },
    { url: `${SITE_URL}/kenya-football/fixtures`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/kenya-football/results`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/transfers`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/standings`, lastModified: now, changeFrequency: "hourly", priority: 0.88 },
    { url: `${SITE_URL}/fixtures`, lastModified: now, changeFrequency: "hourly", priority: 0.85 },
    { url: `${SITE_URL}/results`, lastModified: now, changeFrequency: "hourly", priority: 0.85 },
    { url: `${SITE_URL}/scorers`, lastModified: now, changeFrequency: "daily", priority: 0.75 },
    { url: `${SITE_URL}/teams`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  ];

  return routes;
}
