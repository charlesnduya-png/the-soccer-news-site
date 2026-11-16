import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { listAdminPosts } from "@/lib/admin-store";

export const metadata: Metadata = {
  title: "Site updates | soccer.co.ke",
  description: "Official notes and announcements from the soccer.co.ke team.",
};

export const dynamic = "force-dynamic";
export const revalidate = 60;

function formatWhen(value: string): string {
  try {
    return new Date(value).toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

export default function UpdatesPage() {
  const posts = listAdminPosts({ status: "published" });

  return (
    <>
      <PageHero
        title="Site updates"
        subtitle="Notes from the soccer.co.ke desk — product changes, coverage notes, and announcements."
        badge="Editorial"
      />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        {posts.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center text-white/45">
            No updates published yet.
          </div>
        ) : (
          posts.map((post) => (
            <article
              key={post.id}
              className="rounded-2xl border border-white/10 bg-[#0c0814]/80 p-5 sm:p-7"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00ff87]/85">
                {post.author} · {formatWhen(post.publishedAt ?? post.createdAt)}
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-bebas)] text-3xl tracking-wide text-white">
                {post.title}
              </h2>
              <div className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-white/70">
                {post.body}
              </div>
            </article>
          ))
        )}
        <p className="text-center text-sm text-white/35">
          <Link href="/" className="text-[#00ff87] hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </>
  );
}
