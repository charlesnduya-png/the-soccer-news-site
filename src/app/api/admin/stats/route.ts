import { NextResponse } from "next/server";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin-auth";
import { getGrowthSnapshot } from "@/lib/admin-store";
import { getPulseSnapshot } from "@/lib/site-autopilot";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Admin not configured." }, { status: 503 });
  }
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    growth: getGrowthSnapshot(),
    pulse: getPulseSnapshot(),
  });
}
