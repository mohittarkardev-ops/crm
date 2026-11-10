import { redirect } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { LoginForm } from "@/components/layout/login-form";
import { ResetWelcome } from "@/components/layout/welcome-splash";
import { Button } from "@/components/ui/button";
import { GatekeeperCharacter } from "@/components/ui/characters";
import { getStaff } from "@/lib/auth";

export default async function LoginPage() {
  const { user, staff } = await getStaff();
  if (user && staff) redirect("/");

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <ResetWelcome />
      <div className="glass fade-up w-full max-w-sm rounded-card p-8 shadow-card">
        {user && !staff ? (
          <>
            <div className="mb-6 flex flex-col items-center gap-2 text-center">
              <GatekeeperCharacter />
              <div>
                <h1 className="text-xl font-semibold leading-7 text-ink">SecureDrive CRM</h1>
                <p className="text-xs text-ink-muted">Staff account required</p>
              </div>
            </div>
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
          </>
        ) : (
          <LoginForm />
        )}
      </div>
    </main>
  );
}
