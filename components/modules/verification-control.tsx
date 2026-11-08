"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CONTROL } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/cn";
import type { ActionState } from "@/lib/module-types";
import { VERIFICATION_OPTIONS } from "@/lib/options";

/**
 * Verification buttons for a policy. Verify or reset saves straight away; Reject asks for a reason first
 * (at least 5 characters), which is stored on the policy and sent to the user.
 */
export function VerificationControl({
  current,
  reason,
  action,
}: {
  current: string;
  reason: string | null;
  action: (status: string, reason?: string) => Promise<ActionState>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState(reason ?? "");
  const [error, setError] = useState("");
  const active = busy ?? current;

  async function save(status: string, why?: string) {
    if (busy) return;
    setBusy(status);
    setError("");
    try {
      const result = await action(status, why);
      if (result.ok) {
        toast(result.message ?? "Saved.");
        setRejecting(false);
      } else if (status === "rejected") {
        setError(result.error ?? "Could not reject this policy.");
      } else {
        toast(result.error ?? "Could not save this change.", "error");
      }
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setBusy(null);
    }
  }

  function pick(status: string) {
    if (status === "rejected") {
      setNote(reason ?? note);
      setRejecting(true);
      return;
    }
    setRejecting(false);
    if (status !== current) void save(status);
  }

  return (
    <div className="space-y-3">
      <div role="group" aria-label="Verification" className="inline-flex flex-wrap overflow-hidden rounded-[4px] border border-ink">
        {VERIFICATION_OPTIONS.map((option) => {
          const selected = option.value === active;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              disabled={busy !== null}
              onClick={() => pick(option.value)}
              className={cn(
                "h-8 px-3 text-xs font-medium transition-colors duration-150 disabled:cursor-wait",
                selected ? "bg-ink text-white" : "bg-transparent text-ink hover:bg-surface-muted",
              )}
            >
              {busy === option.value && <Spinner size={12} className="mr-1.5 inline-block align-[-2px]" />}
              {option.label}
            </button>
          );
        })}
      </div>

      {rejecting && (
        <div className="space-y-2 rounded-tile bg-surface-muted p-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-muted">
              Reason for rejection <span className="text-negative">*</span>
            </span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              maxLength={500}
              autoFocus
              className={cn(CONTROL, "py-2.5", error && "border-negative")}
            />
          </label>
          <p className="text-xs text-ink-faint">The user is notified in the app with this reason.</p>
          {error && (
            <p role="alert" className="text-xs text-negative">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRejecting(false)} disabled={busy !== null}>
              Cancel
            </Button>
            <Button onClick={() => save("rejected", note)} loading={busy === "rejected"} disabled={busy !== null}>
              Reject policy
            </Button>
          </div>
        </div>
      )}

      {current === "rejected" && reason && !rejecting && (
        <p className="select-text rounded-control bg-negative-soft px-3 py-2 text-xs text-negative">
          <b>Rejected:</b> {reason}
        </p>
      )}
    </div>
  );
}
