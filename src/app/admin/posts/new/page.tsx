import { redirect } from "next/navigation";
import { PostEditor } from "@/components/admin/post-editor";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminNewPostPage() {
  if (!isAdminConfigured()) redirect("/admin/login");
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00ff87]/85">
          New update
        </p>
        <h2 className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide text-white sm:text-4xl">
          Write a post
        </h2>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <PostEditor />
      </div>
    </div>
  );
}
