"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/module-types";
import { NOT_STAFF, audit, dbMessage, done, fail, formValues, normalizeMobile, requireStaff, text } from "@/lib/actions/shared";

/** Saves the business profile shown in the app (support card and IRDAI disclaimer) into app_settings. */
export async function saveBusinessProfile(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireStaff();
  if (!staff) return fail(NOT_STAFF);
  const values = formValues(formData);

  const businessName = text(formData, "businessName");
  const licence = text(formData, "licence");
  const supportPhone = text(formData, "supportPhone");
  const supportWhatsapp = text(formData, "supportWhatsapp");
  const disclaimer = text(formData, "disclaimer");

  const fieldErrors: Record<string, string> = {};
  if (businessName.length > 120) fieldErrors.businessName = "Name is too long.";
  if (licence.length > 60) fieldErrors.licence = "Licence number is too long.";
  const phone = supportPhone ? normalizeMobile(supportPhone) : null;
  if (supportPhone && !phone) fieldErrors.supportPhone = "Enter a valid 10-digit mobile number.";
  const whatsapp = supportWhatsapp ? normalizeMobile(supportWhatsapp) : null;
  if (supportWhatsapp && !whatsapp) fieldErrors.supportWhatsapp = "Enter a valid 10-digit mobile number.";
  if (disclaimer.length > 1000) fieldErrors.disclaimer = "Disclaimer can be at most 1000 characters.";
  if (Object.keys(fieldErrors).length > 0) return fail("Please fix the highlighted fields.", { fieldErrors, values });

  const db = await createClient();
  const saved = await db.from("app_settings").upsert(
    [
      { key: "business_name", value: businessName || null },
      { key: "irdai_licence", value: licence || null },
      { key: "support_phone", value: phone },
      { key: "support_whatsapp", value: whatsapp },
      { key: "disclaimer", value: disclaimer || null },
    ],
    { onConflict: "key" },
  );
  if (saved.error) {
    const missing = saved.error.code === "PGRST205" || saved.error.code === "42P01";
    return fail(
      missing
        ? "The app_settings table does not exist yet. Run supabase/migrations/0005_app_settings.sql in the SQL Editor."
        : dbMessage(saved.error),
      { values },
    );
  }

  await audit(db, staff.id, "settings.update", "app_settings", null);
  return done("Business profile saved.");
}
