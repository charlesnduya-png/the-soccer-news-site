import type { Metadata } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import { Analytics } from "@/components/analytics";
import { FootballAssistant } from "@/components/football-assistant";
import { IframeBridge } from "@/components/iframe-bridge";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SiteAutopilot } from "@/components/site-autopilot";
import { rootMetadata } from "@/lib/seo";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = rootMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${bebas.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans text-white antialiased">
        <IframeBridge />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <FootballAssistant />
        <SiteAutopilot />
        <Analytics />
      </body>
    </html>
  );
}
