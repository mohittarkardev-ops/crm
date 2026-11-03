import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { LoginForm } from "@/components/layout/login-form";
import { ResetWelcome } from "@/components/layout/welcome-splash";
import { Button } from "@/components/ui/button";
import { getStaff } from "@/lib/auth";

export default async function LoginPage() {
  const { user, staff } = await getStaff();
  if (user && staff) redirect("/");

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <ResetWelcome />
      <div className="glass fade-up w-full max-w-sm rounded-card p-8 shadow-card">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="grid size-12 place-items-center rounded-control bg-ink text-white">
            <ShieldCheck size={24} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-semibold leading-7 text-ink">SecureDrive CRM</h1>
            <p className="text-xs text-ink-muted">The Future is in Good Hands</p>
          </div>
        </div>

        {user && !staff ? (
          <div className="space-y-4 text-center">
            <p role="alert" className="rounded-control bg-warning-soft px-3 py-2 text-xs text-warning">
              {user.email} is not set up as CRM staff.
            </p>
            <form action={signOut}>
              <Button type="submit" variant="secondary" className="w-full">
                Sign out
              </Button>
            </form>
          </div>
        ) : (
          <LoginForm />
        )}
      </div>
    </main>
  );
}
