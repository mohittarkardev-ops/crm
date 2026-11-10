"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { VerificationReviewerCharacter } from "@/components/ui/characters";
import { CONTROL } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { useSlidingPill } from "@/components/ui/use-sliding-pill";
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
  readOnly = false,
  action,
}: {
  current: string;
  reason: string | null;
  /** Shows the current choice but does not let it be changed (no permission). */
  readOnly?: boolean;
  action: (status: string, reason?: string) => Promise<ActionState>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState(reason ?? "");
  const [error, setError] = useState("");
  const [errorPulse, setErrorPulse] = useState(0);
  const active = busy ?? (rejecting ? "rejected" : current);
  const groupRef = useRef<HTMLDivElement>(null);
  const { rect, animated } = useSlidingPill(groupRef, active);

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
        setErrorPulse((n) => n + 1);
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
    if (readOnly) return;
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
      <div
        ref={groupRef}
        role="group"
        aria-label="Verification"
        className="relative inline-flex flex-wrap overflow-hidden rounded-[4px] border border-ink"
      >
        {rect && (
          <span
            aria-hidden="true"
            style={{
              left: 0,
              top: 0,
              width: rect.width,
              height: rect.height,
              transform: `translate3d(${rect.left}px, ${rect.top}px, 0)`,
            }}
            className={cn(
              "pointer-events-none absolute z-0 bg-ink",
              animated && "transition-[transform,width,height] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
            )}
          />
        )}
        {VERIFICATION_OPTIONS.map((option) => {
          const selected = option.value === active;
          return (
            <button
              key={option.value}
              type="button"
              data-pill-key={option.value}
              aria-pressed={selected}
              disabled={busy !== null || readOnly}
              onClick={() => pick(option.value)}
              className={cn(
                "relative z-10 h-8 px-3 text-xs font-medium transition-colors duration-150",
                busy !== null && "cursor-wait",
                readOnly && "cursor-default",
                selected
                  ? rect
                    ? "bg-transparent text-white"
                    : "bg-ink text-white"
                  : "bg-transparent text-ink hover:bg-surface-muted/70",
              )}
            >
              {busy === option.value && <Spinner size={12} className="mr-1.5 inline-block align-[-2px]" />}
              {option.label}
            </button>
          );
        })}
      </div>

      {rejecting && (
        <div className="reveal-down space-y-2.5 rounded-tile bg-surface-muted p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-ink-muted">
              Reason for rejection <span className="text-negative">*</span>
            </span>
            <VerificationReviewerCharacter
              charCount={note.trim().length}
              minChars={5}
              busy={busy === "rejected"}
              hasError={Boolean(error)}
            />
          </div>
          <label className="block">
            <textarea
              aria-label="Reason for rejection"
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
            <p key={errorPulse} role="alert" className="micro-shake text-xs text-negative">
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
