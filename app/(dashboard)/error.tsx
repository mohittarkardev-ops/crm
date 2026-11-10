"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RepairMechanicCharacter } from "@/components/ui/characters";

/** Shown when a page fails to load its data. In development the real message is shown; in production only a digest. */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card className="mx-auto mt-10 flex max-w-lg flex-col items-center gap-3 py-10 text-center">
      <RepairMechanicCharacter />
      <h2 className="text-[15px] font-semibold text-ink">Could not load this page</h2>
      <p className="select-text break-words text-sm text-ink-muted">{error.message}</p>
      {error.digest && <p className="text-[11px] text-ink-faint">Reference: {error.digest}</p>}
      <Button onClick={reset}>Try again</Button>
    </Card>
  );
}
