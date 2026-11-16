import { NextResponse } from "next/server";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin-auth";
import {
  createAdminPost,
  listAdminPosts,
  type AdminPostStatus,
} from "@/lib/admin-store";
import { isNewsTopic, type NewsTopic } from "@/lib/league-news-config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Admin not configured." }, { status: 503 });
  }
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") as AdminPostStatus | "all") || "all";
  return NextResponse.json({ posts: listAdminPosts({ status }) });
}

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Admin not configured." }, { status: 503 });
  }
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    title?: string;
    body?: string;
    status?: AdminPostStatus;
    author?: string;
    topic?: string;
    image?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const title = body.title?.trim() ?? "";
  const content = body.body?.trim() ?? "";
  if (!title || !content) {
    return NextResponse.json(
      { error: "Title and body are required." },
      { status: 400 }
    );
  }

  const topic: NewsTopic =
    body.topic && isNewsTopic(body.topic) ? body.topic : "european-leagues";

  const post = createAdminPost({
    title,
    body: content,
    status: body.status === "draft" ? "draft" : "published",
    author: body.author,
    topic,
    image: body.image ?? null,
  });

  return NextResponse.json({ post }, { status: 201 });
}
