"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { PrimaryForm } from "@/components/modules/module-page";
import { Button, buttonStyles } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
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
  const [dirty, setDirty] = useState(false);
  const [version, setVersion] = useState(0);

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setDirty(false);
          setVersion((v) => v + 1);
          setOpen(true);
        }}
      >
        <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
        Edit
      </Button>
      <Drawer
        open={open}
        title="Edit Policy"
        dirty={dirty}
        onClose={() => {
          setDirty(false);
          setOpen(false);
        }}
      >
        <PrimaryForm
          key={version}
          primary={{ label: "Save", drawerTitle: "Edit Policy", fields, action }}
          initialValues={values}
          onDirtyChange={setDirty}
          onClose={() => {
            setDirty(false);
            setOpen(false);
          }}
        />
      </Drawer>
    </>
  );
}

/**
 * Delete button. Uses a Hudson confirmation popover, shows a spinner while it works, and the server action
 * sends the browser back to the list when it succeeds. A failure shows a message and the button works again.
 */
export function DeletePolicyButton({ action }: { action: () => Promise<ActionState> }) {
  const [busy, setBusy] = useState(false);

  async function run() {
    if (busy) return;
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
    <ConfirmButton
      title="Delete policy?"
      description="Its uploaded documents and renewal history will be deleted permanently. This cannot be undone."
      confirmLabel="Delete policy"
      loading={busy}
      onConfirm={run}
      className={buttonStyles("danger")}
    >
      {!busy && <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />}
      Delete
    </ConfirmButton>
  );
}
