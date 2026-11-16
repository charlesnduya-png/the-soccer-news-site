import { NextResponse } from "next/server";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin-auth";
import {
  deleteAdminPost,
  getAdminPost,
  updateAdminPost,
  type AdminPostStatus,
} from "@/lib/admin-store";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Admin not configured." }, { status: 503 });
  }
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const post = getAdminPost(id);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }
  return NextResponse.json({ post });
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Admin not configured." }, { status: 503 });
  }
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  let body: {
    title?: string;
    body?: string;
    status?: AdminPostStatus;
    author?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const post = updateAdminPost(id, body);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }
  return NextResponse.json({ post });
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Admin not configured." }, { status: 503 });
  }
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!deleteAdminPost(id)) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
