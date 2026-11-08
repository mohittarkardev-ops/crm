"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { PendingBar } from "@/components/ui/pending-bar";
import { FieldGrid } from "@/components/ui/field";
import { toast } from "@/components/ui/toaster";
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
export function BusinessProfileForm({ profile }: { profile: BusinessProfile }) {
  const [state, formAction, pending] = useActionState(saveBusinessProfile, { ok: false } as ActionState);
  const handled = useRef<ActionState | null>(null);

  useEffect(() => {
    if (!state.ok || handled.current === state) return;
    handled.current = state;
    toast(state.message ?? "Saved.");
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
    <form action={formAction} noValidate>
      <PendingBar active={pending} className="mb-3" />
      {state.error && (
        <p role="alert" className="mb-4 rounded-control bg-negative-soft px-3 py-2 text-xs text-negative">
          {state.error}
        </p>
      )}
      <FieldGrid key={errorKey} fields={FIELDS} errors={state.fieldErrors} values={state.values ?? stored} />
      <div className="mt-5 flex justify-end">
        <Button type="submit" loading={pending}>
          Save
        </Button>
      </div>
    </form>
  );
}
