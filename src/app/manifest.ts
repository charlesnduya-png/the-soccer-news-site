import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — ${SITE_TAGLINE}`,
    short_name: SITE_NAME,
    description:
      "Live scores, news and tables for 15 European leagues plus Kenyan KPL football. Free, fast updates every 2 minutes.",
    start_url: "/",
    display: "standalone",
    background_color: "#120228",
    theme_color: "#37003c",
    orientation: "portrait-primary",
    categories: ["sports", "news"],
    lang: "en",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
