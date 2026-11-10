import { createClient } from "@/lib/supabase/server";
import { rowsOf } from "@/lib/data/helpers";

export type InsurerItem = { id: string; name: string; logoUrl: string | null };

/** All insurers from `public.insurers` (alphabetical), including future logo URLs. */
export async function getInsurers(): Promise<InsurerItem[]> {
  const db = await createClient();
  const res = await db.from("insurers").select("id, name, logo_url").order("name");
  return rowsOf<{ id: string; name: string; logo_url: string | null }>(res, "Insurers").map((i) => ({
    id: i.id,
    name: i.name,
    logoUrl: i.logo_url ?? null,
  }));
}

/** Existing insurer names. */
export async function getInsurerNames(): Promise<string[]> {
  return (await getInsurers()).map((i) => i.name);
}

export type BusinessProfile = {
  businessName: string;
  licence: string;
  supportPhone: string;
  supportWhatsapp: string;
  disclaimer: string;
};

/** The business profile from app_settings. `missing` is true until migration 0005 has been run. */
export async function getBusinessProfile(): Promise<{ profile: BusinessProfile; missing: boolean }> {
  const db = await createClient();
  const res = await db.from("app_settings").select("key, value");

  const empty: BusinessProfile = { businessName: "", licence: "", supportPhone: "", supportWhatsapp: "", disclaimer: "" };
  if (res.error) {
    if (res.error.code === "PGRST205" || res.error.code === "42P01") return { profile: empty, missing: true };
    throw new Error(`Business profile: ${res.error.message}`);
  }

  const map = new Map(rowsOf<{ key: string; value: string | null }>(res, "Business profile").map((r): [string, string] => [r.key, r.value ?? ""]));
  return {
    missing: false,
    profile: {
      businessName: map.get("business_name") ?? "",
      licence: map.get("irdai_licence") ?? "",
      supportPhone: map.get("support_phone") ?? "",
      supportWhatsapp: map.get("support_whatsapp") ?? "",
      disclaimer: map.get("disclaimer") ?? "",
    },
  };
}
