"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/module-types";
import { audit, authorize, dbMessage, done, fail, formValues, normalizeMobile, text } from "@/lib/actions/shared";

async function setSlot(slotName: string, enabled: boolean): Promise<ActionState> {
  const auth = await authorize("ads.manage");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;

  const db = await createClient();
  const result = await db.from("ad_slots").update({ is_enabled: enabled }).eq("slot_name", slotName).select("slot_name");
  if (result.error) return fail(dbMessage(result.error));
  if ((result.data ?? []).length === 0) return fail("That ad slot could not be found.");

  await audit(db, staff.id, enabled ? "ad_slot.on" : "ad_slot.off", "ad_slot", null);
  return done(enabled ? "Ad slot switched on." : "Ad slot switched off.");
}

export async function enableAdSlot(slotName: string) {
  return setSlot(slotName, true);
}

export async function disableAdSlot(slotName: string) {
  return setSlot(slotName, false);
}

/** Marks an existing user as ad-free. The app reads ad_settings.show_ads. */
export async function addAdFreeUser(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("ads.manage");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  const values = formValues(formData);

  const mobile = normalizeMobile(text(formData, "mobile"));
  if (!mobile) {
    return fail("Please fix the highlighted fields.", {
      fieldErrors: { mobile: "Enter a valid 10-digit Indian mobile number." },
      values,
    });
  }

  const db = await createClient();
  const user = await db.from("users").select("id, full_name").eq("mobile_number", mobile).maybeSingle();
  if (user.error) return fail(dbMessage(user.error), { values });
  if (!user.data) {
    return fail("No user has this mobile number.", {
      fieldErrors: { mobile: "Add them under Clients first." },
      values,
    });
  }

  const saved = await db
    .from("ad_settings")
    .upsert({ user_id: user.data.id, show_ads: false }, { onConflict: "user_id" });
  if (saved.error) return fail(dbMessage(saved.error), { values });

  await audit(db, staff.id, "ad_free.add", "user", user.data.id as string);
  return done(`${user.data.full_name ?? mobile} will no longer see ads.`);
}

export async function removeAdFreeUser(userId: string): Promise<ActionState> {
  const auth = await authorize("ads.manage");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;

  const db = await createClient();
  const result = await db.from("ad_settings").update({ show_ads: true }).eq("user_id", userId).select("user_id");
  if (result.error) return fail(dbMessage(result.error));
  if ((result.data ?? []).length === 0) return fail("That user could not be found.");

  await audit(db, staff.id, "ad_free.remove", "user", userId);
  return done("This user will see ads again.");
}
