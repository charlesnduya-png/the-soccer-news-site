import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Bebas_Neue, Inter } from "next/font/google";
import { Analytics } from "@/components/analytics";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { DeferredWidgets } from "@/components/deferred-widgets";
import { IframeBridge } from "@/components/iframe-bridge";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { MobileZoomLock } from "@/components/mobile-zoom-lock";
import { HideOnAdmin } from "@/components/site-chrome";
import { ThemeProvider, themeBootScript } from "@/components/theme-provider";
import { rootMetadata } from "@/lib/seo";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = rootMetadata;

/** Mobile viewport — paired with MobileZoomLock for iOS Safari. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#07060f",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${bebas.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="flex min-h-full flex-col overflow-x-hidden font-sans text-[var(--fg)] antialiased">
        <ThemeProvider>
          <MobileZoomLock />
          <IframeBridge />
          <HideOnAdmin>
            <SiteHeader />
          </HideOnAdmin>
          <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
          <HideOnAdmin>
            <SiteFooter />
            <DeferredWidgets />
          </HideOnAdmin>
          <Suspense fallback={null}>
            <AnalyticsBeacon />
          </Suspense>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
