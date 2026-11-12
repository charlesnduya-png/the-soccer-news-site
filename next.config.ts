import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Easier deploy on VPS / Docker / shared Node hosts
  output: "standalone",
  // Faster production responses
  compress: true,
  poweredByHeader: false,
  // Tree-shake heavy packages for smaller client bundles
  experimental: {
    optimizePackageImports: ["date-fns"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 7,
    remotePatterns: [
      { protocol: "https", hostname: "flagcdn.com" },
      { protocol: "https", hostname: "crests.football-data.org" },
      { protocol: "https", hostname: "images.fotmob.com" },
      { protocol: "https", hostname: "media.guim.co.uk" },
      { protocol: "https", hostname: "ichef.bbci.co.uk" },
      { protocol: "https", hostname: "e3.365dm.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "**.sky.com" },
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "**.cloudfront.net" },
      { protocol: "https", hostname: "**.wp.com" },
      { protocol: "https", hostname: "**.reuters.com" },
      { protocol: "https", hostname: "**.espn.com" },
      { protocol: "https", hostname: "**.goal.com" },
      { protocol: "https", hostname: "**.standardmedia.co.ke" },
      { protocol: "https", hostname: "cdn.standardmedia.co.ke" },
      { protocol: "https", hostname: "r2.thesportsdb.com" },
      { protocol: "https", hostname: "www.thesportsdb.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/news/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/banners/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors *",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
