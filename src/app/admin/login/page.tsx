import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) {
    redirect("/admin");
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-8 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00ff87]/85">
          Secure access
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-bebas)] text-4xl tracking-wide text-white">
          Sign in
        </h2>
        <p className="mt-2 text-sm text-white/50">
          Growth metrics and editorial posting for soccer.co.ke.
        </p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <AdminLoginForm configured={isAdminConfigured()} />
      </div>
    </div>
  );
}
