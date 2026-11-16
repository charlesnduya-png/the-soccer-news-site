import { NextResponse } from "next/server";
import { getAdminMedia } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const asset = getAdminMedia(id);
  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bytes = Buffer.from(asset.data, "base64");
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": asset.mime,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "Content-Length": String(bytes.length),
    },
  });
}
