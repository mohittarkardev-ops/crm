import { redirect } from "next/navigation";
import { NavProgress } from "@/components/layout/nav-progress";
import { Sidebar } from "@/components/layout/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { Topbar } from "@/components/layout/topbar";
import { WelcomeSplash } from "@/components/layout/welcome-splash";
import { getStaff } from "@/lib/auth";
import { allowedPermissions } from "@/lib/rbac/permissions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, staff } = await getStaff();
  // Signed out, or signed in with an account that is not in staff_users: the login page handles both.
  if (!user || !staff) redirect("/login");

  const allowed = allowedPermissions(staff);

  return (
    <div className="flex min-h-screen gap-4 p-4">
      <WelcomeSplash name={staff.full_name} />
      <NavProgress />
      <Toaster />
      <Sidebar allowed={allowed} />
      <div className="flex min-w-0 flex-1 flex-col gap-4 pb-24 lg:pb-0">
        <Topbar
          account={{ id: staff.id, name: staff.full_name, email: staff.email, role: staff.role, roleName: staff.role_name }}
          allowed={allowed}
        />
        <main className="mx-auto w-full max-w-[1440px] flex-1">{children}</main>
      </div>
    </div>
  );
}
