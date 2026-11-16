import { NextResponse } from "next/server";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin-auth";
import { saveAdminMedia } from "@/lib/admin-store";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Admin not configured." }, { status: 503 });
  }
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload body." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image file." }, { status: 400 });
  }

  const mime = file.type || "application/octet-stream";
  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    const saved = saveAdminMedia({ mime, bytes });
    return NextResponse.json({ url: saved.url, id: saved.id });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not save image.",
      },
      { status: 400 }
    );
  }
}
