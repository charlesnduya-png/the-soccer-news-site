"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ADMIN_POST_TOPIC_OPTIONS,
} from "@/lib/admin-post-topics";
import type { AdminPost, AdminPostStatus } from "@/lib/admin-store";
import type { NewsTopic } from "@/lib/league-news-config";

export function PostEditor({ post }: { post?: AdminPost }) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [author, setAuthor] = useState(post?.author ?? "Admin");
  const [status, setStatus] = useState<AdminPostStatus>(post?.status ?? "published");
  const [topic, setTopic] = useState<NewsTopic>(
    post?.topic ?? "european-leagues"
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedHint =
    ADMIN_POST_TOPIC_OPTIONS.find((option) => option.value === topic)?.hint ??
    "";

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const endpoint = post ? `/api/admin/posts/${post.id}` : "/api/admin/posts";
      const method = post ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, author, status, topic }),
      });
      const data = (await res.json()) as { error?: string; post?: AdminPost };
      if (!res.ok || !data.post) {
        setError(data.error || "Could not save post.");
        return;
      }
      router.push("/admin/posts");
      router.refresh();
    } catch {
      setError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
            Title
          </span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none focus:border-[#00ff87]/50 focus:ring-2 focus:ring-[#00ff87]/25"
            placeholder="Headline for your update"
            required
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
            Display in news category
          </span>
          <select
            value={topic}
            onChange={(event) => setTopic(event.target.value as NewsTopic)}
            className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none focus:border-[#00ff87]/50 focus:ring-2 focus:ring-[#00ff87]/25"
          >
            {ADMIN_POST_TOPIC_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-sm text-white/45">{selectedHint}</p>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
            Author
          </span>
          <input
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
            className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none focus:border-[#00ff87]/50 focus:ring-2 focus:ring-[#00ff87]/25"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
            Status
          </span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as AdminPostStatus)}
            className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none focus:border-[#00ff87]/50 focus:ring-2 focus:ring-[#00ff87]/25"
          >
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
          Body
        </span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={12}
          className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none focus:border-[#00ff87]/50 focus:ring-2 focus:ring-[#00ff87]/25"
          placeholder="Write the update fans should see…"
          required
        />
      </label>

      {error ? (
        <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || !title.trim() || !body.trim()}
          className="rounded-full bg-[#00ff87] px-5 py-2.5 text-sm font-bold text-[#07060f] transition hover:bg-[#7dffb8] disabled:opacity-50"
        >
          {saving ? "Saving…" : post ? "Update post" : "Publish post"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/posts")}
          className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/70 transition hover:border-white/30 hover:text-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
