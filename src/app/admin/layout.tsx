import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { isAdminConfigured } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Admin · soccer.co.ke",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell configured={isAdminConfigured()}>{children}</AdminShell>;
}
