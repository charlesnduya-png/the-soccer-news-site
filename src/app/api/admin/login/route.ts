import { NextResponse } from "next/server";
import {
  adminCookieOptions,
  createAdminSessionToken,
  isAdminConfigured,
  passwordMatches,
  ADMIN_COOKIE,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      {
        error:
          "Admin password is not configured. Set ADMIN_PASSWORD in the environment.",
      },
      { status: 503 }
    );
  }

  let body: { password?: string };
  try {
    body = (await request.json()) as { password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const password = body.password ?? "";
  if (!passwordMatches(password)) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    ADMIN_COOKIE,
    createAdminSessionToken(),
    adminCookieOptions()
  );
  return response;
}
