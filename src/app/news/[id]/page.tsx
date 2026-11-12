import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { JsonLd } from "@/components/json-ld";
import { NewsArticleImage } from "@/components/news-article-image";
import { NewsVideoPlayer } from "@/components/news-video";
import {
  getNews,
  getNewsArticleById,
  isKenyanFootballArticle,
} from "@/lib/news-api";
import { toVideoEmbed, videoDescription } from "@/lib/news-video";
import { SITE_NAME, SITE_URL, metaDescription } from "@/lib/seo";
import { formatNewsDate } from "@/lib/utils";

export const revalidate = 120;

interface PageProps {
  params: Promise<{ id: string }>;
}

const loadArticle = cache(async (id: string) => getNewsArticleById(id));

function articleParagraphs(content: string): string[] {
  const blocks = content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

  if (blocks.length > 1 || content.length < 600) return blocks;

  const sentences = content.split(/(?<=[.!?])\s+/);
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += 3) {
    paragraphs.push(sentences.slice(i, i + 3).join(" "));
  }
  return paragraphs;
}

function readingMinutes(content: string): number {
  return Math.max(1, Math.ceil(content.split(/\s+/).length / 220));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const article = await loadArticle(id);
  if (!article) {
    return { title: `Story not found | ${SITE_NAME}` };
  }

  const description = metaDescription(
    article.description || article.title,
    160
  );

  return {
    title: article.title,
    description,
    alternates: { canonical: `${SITE_URL}/news/${article.id}` },
    openGraph: {
      title: article.title,
      description,
      url: `${SITE_URL}/news/${article.id}`,
      type: "article",
      siteName: SITE_NAME,
      images: article.image ? [{ url: article.image }] : undefined,
      videos: article.videoUrl ? [{ url: article.videoUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
      images: article.image ? [article.image] : undefined,
    },
  };
}

export default async function NewsArticlePage({ params }: PageProps) {
  const { id } = await params;
  const article = await loadArticle(id);
  if (!article) notFound();

  const videoEmbed = article.videoUrl ? toVideoEmbed(article.videoUrl) : null;
  const isKenyan = isKenyanFootballArticle(
    article.title,
    article.description
  );

  // Related stories from warm cache only — don't wait on a full refresh.
  const related = (
    await getNews(12, isKenyan ? "kenyan-football" : "european-leagues")
  )
    .filter((a) => a.id !== article.id)
    .slice(0, 4);

  const extendedContent = article.content?.trim();
  const hasExtendedContent =
    Boolean(extendedContent) &&
    extendedContent?.toLowerCase() !== article.description.trim().toLowerCase();
  const content = hasExtendedContent
    ? extendedContent!
    : article.description.trim();
  const paragraphs = articleParagraphs(content);
  const sourceIsExternal = /^https?:\/\//i.test(article.link);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: article.title,
          description: article.description,
          datePublished: article.pubDate,
          image: article.image,
          mainEntityOfPage: `${SITE_URL}/news/${article.id}`,
          publisher: {
            "@type": "Organization",
            name: SITE_NAME,
            url: SITE_URL,
            logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
          },
        }}
      />
      <article className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Link
          href={isKenyan ? "/kenya-football" : "/news"}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#00ff87]/90 transition hover:text-[#00ff87]"
        >
          ← Back to {isKenyan ? "Kenyan football" : "news"}
        </Link>

        <header className="mt-6 max-w-3xl">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-[#00ff87]/20 px-2.5 py-0.5 font-semibold text-[#00ff87]">
              {article.source}
            </span>
            {videoEmbed ? (
              <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 font-semibold uppercase tracking-wide text-white/85">
                Video
              </span>
            ) : null}
            <span className="text-white/40">{formatNewsDate(article.pubDate)}</span>
            <span className="text-white/25">·</span>
            <span className="text-white/40">{readingMinutes(content)} min read</span>
          </div>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl leading-[1.05] tracking-wide text-white sm:text-5xl">
            {article.title}
          </h1>
          {article.description && hasExtendedContent ? (
            <p className="mt-5 text-lg leading-relaxed text-white/60 sm:text-xl">
              {article.description}
            </p>
          ) : null}
        </header>

        {videoEmbed ? (
          <NewsVideoPlayer
            embed={videoEmbed}
            title={article.title}
            description={videoDescription(
              article.title,
              article.source,
              article.description
            )}
            source={article.source}
            poster={article.image}
          />
        ) : (
          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl border border-white/10 bg-[#110c1c]">
            <NewsArticleImage
              src={article.image}
              articleLink={article.link}
              articleId={article.id}
              priority
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00ff87]">
                {hasExtendedContent ? "Story details" : "Story summary"}
              </p>
              <p className="mt-1 text-sm text-white/45">
                Reported by {article.source}
              </p>
            </div>
            {sourceIsExternal ? (
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#00ff87] px-3.5 py-1.5 text-xs font-bold text-[#07060f] transition hover:bg-[#7dffb8]"
              >
                Read full story ↗
              </a>
            ) : (
              <span className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">
                {readingMinutes(content)} min read
              </span>
            )}
          </div>

          <div className="space-y-5 text-base leading-8 text-white/80 sm:text-lg">
            {paragraphs.length > 0 ? (
              paragraphs.map((paragraph, i) => (
                <p key={`${i}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
              ))
            ) : (
              <p>More details are available from the original publisher.</p>
            )}
          </div>

          {sourceIsExternal ? (
            <div className="mt-8 border-t border-white/10 pt-5">
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#00ff87] transition hover:text-white"
              >
                Continue reading on {article.source} ↗
              </a>
            </div>
          ) : null}
        </div>

        {related.length > 0 ? (
          <section className="mt-12">
            <h2 className="mb-5 font-[family-name:var(--font-bebas)] text-3xl tracking-wide text-white">
              Related stories
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {related.map((item) => (
                <Link
                  key={item.id}
                  href={`/news/${item.id}`}
                  prefetch
                  className="group rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-[#00ff87]/35"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#00ff87]/80">
                    {item.source}
                  </p>
                  <p className="mt-2 font-semibold leading-snug text-white transition group-hover:text-[#00ff87]">
                    {item.title}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </>
  );
}
