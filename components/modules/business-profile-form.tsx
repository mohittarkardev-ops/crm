"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AgencySealCharacter } from "@/components/ui/characters";
import { PendingBar } from "@/components/ui/pending-bar";
import { FieldGrid } from "@/components/ui/field";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/cn";
import { saveBusinessProfile } from "@/lib/actions/settings";
import type { BusinessProfile } from "@/lib/data/lookups";
import type { ActionState, FieldDef } from "@/lib/module-types";

const FIELDS: FieldDef[] = [
  { name: "businessName", label: "Advisor or business name" },
  { name: "licence", label: "IRDAI licence number" },
  { name: "supportPhone", label: "Support phone", type: "tel", hint: "Shown in the app's support card." },
  { name: "supportWhatsapp", label: "Support WhatsApp number", type: "tel" },
  { name: "disclaimer", label: "Disclaimer shown in the app", type: "textarea", full: true },
];

/** Business profile saved to app_settings. Shows the stored values and keeps typed text after an error. */
export function BusinessProfileForm({
  profile,
  readOnly = false,
}: {
  profile: BusinessProfile;
  readOnly?: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveBusinessProfile, { ok: false } as ActionState);
  const handled = useRef<ActionState | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [errorPulse, setErrorPulse] = useState(0);

  useEffect(() => {
    if (state.ok && handled.current !== state) {
      handled.current = state;
      toast(state.message ?? "Saved.");
      setSavedFlash(true);
      const t = window.setTimeout(() => setSavedFlash(false), 1600);
      return () => window.clearTimeout(t);
    }
    if (!state.ok && (state.error || state.fieldErrors)) {
      setErrorPulse((n) => n + 1);
    }
  }, [state]);

  const stored: Record<string, string> = {
    businessName: profile.businessName,
    licence: profile.licence,
    supportPhone: profile.supportPhone,
    supportWhatsapp: profile.supportWhatsapp,
    disclaimer: profile.disclaimer,
  };
  const errorKey = `${state.error ?? ""}|${Object.keys(state.fieldErrors ?? {}).join(",")}`;

  return (
    <form action={readOnly ? undefined : formAction} noValidate>
      {!readOnly && <PendingBar active={pending} className="mb-3" />}
      <div className="mb-4 flex items-center gap-3 rounded-tile border border-divider/60 bg-surface-muted/40 px-3.5 py-2.5">
        <AgencySealCharacter state={readOnly ? "readonly" : savedFlash ? "saved" : "idle"} />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-ink">
            {savedFlash
              ? "Business profile updated!"
              : readOnly
                ? "View-only agency licence card"
                : "Agency identity & IRDAI credentials"}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-muted">
            {savedFlash
              ? "Changes are live across the client mobile app support card."
              : "Displayed to clients inside the SecureDrive mobile app."}
          </p>
        </div>
      </div>
      {state.error && (
        <p key={errorPulse} role="alert" className="micro-shake mb-4 rounded-control bg-negative-soft px-3 py-2 text-xs text-negative">
          {state.error}
        </p>
      )}
      <fieldset disabled={readOnly || pending} className={cn("m-0 min-w-0 border-0 p-0", readOnly && "opacity-80")}>
        <FieldGrid key={errorKey} fields={FIELDS} errors={state.fieldErrors} values={state.values ?? stored} />
      </fieldset>
      {readOnly ? (
        <p className="mt-4 text-xs text-ink-muted">View-only access — ask an admin for Settings Edit permission to update this profile.</p>
      ) : (
        <div className="mt-5 flex justify-end">
          <Button type="submit" loading={pending} saved={savedFlash} savedLabel="Saved">
            Save
          </Button>
        </div>
      )}
    </form>
  );
}
