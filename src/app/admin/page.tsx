import { redirect } from "next/navigation";
import { GrowthDashboard } from "@/components/admin/growth-dashboard";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  if (!isAdminConfigured()) {
    redirect("/admin/login");
  }
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  return <GrowthDashboard />;
}
