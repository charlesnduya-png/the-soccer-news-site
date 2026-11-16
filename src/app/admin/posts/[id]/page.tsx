import { notFound, redirect } from "next/navigation";
import { PostEditor } from "@/components/admin/post-editor";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin-auth";
import { getAdminPost } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminEditPostPage({ params }: PageProps) {
  if (!isAdminConfigured()) redirect("/admin/login");
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const { id } = await params;
  const post = getAdminPost(id);
  if (!post) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00ff87]/85">
          Edit update
        </p>
        <h2 className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide text-white sm:text-4xl">
          {post.title}
        </h2>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <PostEditor post={post} />
      </div>
    </div>
  );
}
