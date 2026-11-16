"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminTopicDisplayLabel } from "@/lib/admin-post-topics";
import type { AdminPost } from "@/lib/admin-store";

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

export function PostsManager({ initialPosts }: { initialPosts: AdminPost[] }) {
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function remove(id: string) {
    if (!window.confirm("Delete this post?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setPosts((current) => current.filter((post) => post.id !== id));
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function toggleStatus(post: AdminPost) {
    setBusyId(post.id);
    try {
      const nextStatus = post.status === "published" ? "draft" : "published";
      const res = await fetch(`/api/admin/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = (await res.json()) as { post?: AdminPost };
      if (!res.ok || !data.post) return;
      setPosts((current) =>
        current.map((item) => (item.id === post.id ? data.post! : item))
      );
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00ff87]/85">
            Editorial
          </p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide text-white sm:text-4xl">
            Admin posts
          </h2>
          <p className="mt-2 text-sm text-white/50">
            Publish site updates that appear on /updates for fans.
          </p>
        </div>
        <Link
          href="/admin/posts/new"
          className="rounded-full bg-[#00ff87] px-4 py-2 text-sm font-bold text-[#07060f] transition hover:bg-[#7dffb8]"
        >
          New post
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 px-5 py-12 text-center text-white/45">
          No posts yet. Create your first update.
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li
              key={post.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 gap-3">
                  {post.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.image}
                      alt=""
                      className="h-16 w-24 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[10px] text-white/30">
                      No image
                    </div>
                  )}
                  <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${
                        post.status === "published"
                          ? "bg-[#00ff87]/15 text-[#00ff87]"
                          : "bg-white/10 text-white/55"
                      }`}
                    >
                      {post.status}
                    </span>
                    <span className="text-xs text-white/35">
                      {formatWhen(post.updatedAt)}
                    </span>
                  </div>
                  <h3 className="truncate text-lg font-semibold text-white">
                    {post.title}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-[#00ff87]/85">
                    Shows in · {adminTopicDisplayLabel(post.topic)}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-white/45">
                    {post.body}
                  </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/posts/${post.id}`}
                    className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/75 transition hover:border-[#00ff87]/40 hover:text-[#00ff87]"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    disabled={busyId === post.id}
                    onClick={() => void toggleStatus(post)}
                    className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/75 transition hover:border-[#00ff87]/40 hover:text-[#00ff87] disabled:opacity-50"
                  >
                    {post.status === "published" ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === post.id}
                    onClick={() => void remove(post.id)}
                    className="rounded-full border border-red-400/20 px-3 py-1.5 text-xs font-semibold text-red-300/80 transition hover:border-red-400/40 hover:text-red-200 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
