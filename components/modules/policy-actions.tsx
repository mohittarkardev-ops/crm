"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { PrimaryForm } from "@/components/modules/module-page";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { toast } from "@/components/ui/toaster";
import type { ActionState, FieldDef, FormAction } from "@/lib/module-types";

/** Edit button for the policy page: opens the same drawer form as the lists, filled with the current values. */
export function EditPolicyButton({
  fields,
  values,
  action,
}: {
  fields: FieldDef[];
  values: Record<string, string>;
  action: FormAction;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
        Edit
      </Button>
      <Drawer open={open} title="Edit Policy" onClose={() => setOpen(false)}>
        <PrimaryForm
          primary={{ label: "Save", drawerTitle: "Edit Policy", fields, action }}
          initialValues={values}
          onClose={() => setOpen(false)}
        />
      </Drawer>
    </>
  );
}

/**
 * Delete button. Asks first, shows a spinner while it works, and the server action sends the browser back to the
 * list when it succeeds. A failure shows a message and the button works again.
 */
export function DeletePolicyButton({ action }: { action: () => Promise<ActionState> }) {
  const [busy, setBusy] = useState(false);

  async function run() {
    if (busy) return;
    if (!window.confirm("Delete this policy? Its documents and renewal history are deleted too. This cannot be undone.")) return;
    setBusy(true);
    try {
      const result = await action();
      // On success the action redirects, so nothing comes back; only a failure returns a result.
      if (result && !result.ok) {
        toast(result.error ?? "Could not delete this policy.", "error");
        setBusy(false);
      }
    } catch {
      toast("Something went wrong. Please try again.", "error");
      setBusy(false);
    }
  }

  return (
    <Button variant="danger" onClick={run} loading={busy}>
      <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
      Delete
    </Button>
  );
}
