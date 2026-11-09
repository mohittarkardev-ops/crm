import Link from "next/link";
import { Lock } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAccess } from "@/lib/rbac/server";
import { NAV_ITEMS } from "@/lib/nav";

/** Shown when someone opens a screen their role does not allow. */
export default async function NoAccessPage() {
  const { allowed } = await getAccess();
  const firstAllowed = NAV_ITEMS.find((item) => allowed.includes(item.permission));

  return (
    <Card className="mx-auto mt-10 flex max-w-lg flex-col items-center gap-3 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-surface-muted text-ink-faint">
        <Lock size={22} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <h2 className="text-[15px] font-semibold text-ink">You do not have access to this screen</h2>
      <p className="text-sm text-ink-muted">Ask an admin if you need it.</p>
      {firstAllowed && (
        <Link href={firstAllowed.href} className={buttonStyles("secondary")}>
          Go to {firstAllowed.label}
        </Link>
      )}
    </Card>
  );
}
