"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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
