import { redirect } from "next/navigation";
import { PostsManager } from "@/components/admin/posts-manager";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin-auth";
import { listAdminPosts } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

export default async function AdminPostsPage() {
  if (!isAdminConfigured()) redirect("/admin/login");
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const posts = listAdminPosts();
  return <PostsManager initialPosts={posts} />;
}
