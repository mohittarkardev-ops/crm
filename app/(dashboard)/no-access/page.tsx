import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GatekeeperCharacter } from "@/components/ui/characters";
import { getAccess } from "@/lib/rbac/server";
import { NAV_ITEMS } from "@/lib/nav";

/** Shown when someone opens a screen their role does not allow. */
export default async function NoAccessPage() {
  const { allowed } = await getAccess();
  const firstAllowed = NAV_ITEMS.find((item) => allowed.includes(item.permission));

  return (
    <Card className="mx-auto mt-10 flex max-w-lg flex-col items-center gap-3 py-10 text-center">
      <GatekeeperCharacter />
      <h2 className="text-[15px] font-semibold text-ink">You do not have access to this screen</h2>
      <p className="text-sm text-ink-muted">Ask an admin if you need this module enabled on your role.</p>
      {firstAllowed && (
        <Link href={firstAllowed.href} className={buttonStyles("secondary")}>
          Go to {firstAllowed.label}
        </Link>
      )}
    </Card>
  );
}
