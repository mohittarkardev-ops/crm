import type { InsurerItem } from "@/lib/data/lookups";
import type { FieldDef, Option } from "@/lib/module-types";

export const OTHER_INSURER_VALUE = "__other__";

/**
 * Matches a policy's stored insurer text against the live `insurers` table case-insensitively so
 * `CustomSelect` highlights the canonical option on Edit forms.
 */
export function normalizeInsurerValue(insurers: InsurerItem[], current?: string | null): string {
  const clean = (current ?? "").trim();
  if (!clean) return "";
  const hit = insurers.find((i) => i.name.trim().toLowerCase() === clean.toLowerCase());
  return hit ? hit.name : clean;
}

/**
 * Searchable Insurer dropdown powered by `public.insurers` (with logo/monogram support),
 * plus an "Other / Add new insurer…" option revealing an inline text box via `showWhen`.
 */
export function insurerFields(insurers: InsurerItem[], currentInsurer?: string | null): FieldDef[] {
  const options: Option[] = insurers.map((i) => ({
    value: i.name,
    label: i.name,
    logoUrl: i.logoUrl,
    showBadge: true,
  }));

  const normalized = normalizeInsurerValue(insurers, currentInsurer);
  if (normalized && !options.some((o) => o.value === normalized)) {
    options.unshift({
      value: normalized,
      label: normalized,
      showBadge: true,
    });
  }

  options.push({
    value: OTHER_INSURER_VALUE,
    label: "Other / Add new insurer…",
    hint: "Save a new company to the insurers list",
  });

  return [
    { name: "insurer", label: "Insurer", type: "select", options, required: true },
    {
      name: "insurerCustom",
      label: "New insurer name",
      required: true,
      hint: "Added to the insurers directory for future policies.",
      showWhen: { field: "insurer", equals: [OTHER_INSURER_VALUE] },
    },
  ];
}

const VEHICLE_GROUP_OPTIONS: Option[] = [
  { value: "", label: "Same as category" },
  { value: "2W", label: "Two wheeler (2W)" },
  { value: "4W", label: "Four wheeler (4W)" },
  { value: "CV", label: "Commercial vehicle (CV)" },
];

/**
 * Vehicle fields for Add Policy and Edit Policy. In the Add form they appear only when the category is Car or
 * Two Wheeler (`onlyForVehicles`); the Edit form includes them only for policies that are vehicles.
 */
export function vehicleFields(onlyForVehicles: boolean): FieldDef[] {
  const fields: FieldDef[] = [
    { name: "vehicleRegNo", label: "Vehicle registration no." },
    { name: "vehicleGroup", label: "Vehicle group", type: "select", options: VEHICLE_GROUP_OPTIONS },
    { name: "vehicleMake", label: "Make" },
    { name: "vehicleModel", label: "Model" },
    { name: "vehicleFuel", label: "Fuel type" },
    { name: "vehicleMfy", label: "Manufacturing year" },
    { name: "vehicleRegnDate", label: "Registration date", type: "date", maxToday: true },
    { name: "vehicleChassis", label: "Chassis no." },
    { name: "vehicleEngine", label: "Engine no." },
    { name: "vehicleCc", label: "Engine cc" },
    { name: "seatingCapacity", label: "Seating capacity" },
    { name: "idv", label: "IDV (₹)", type: "number" },
    { name: "saodDueDate", label: "Own-damage (SAOD) due date", type: "date" },
    { name: "tpDueDate", label: "Third-party (TP) due date", type: "date" },
    { name: "rtoLocation", label: "RTO location" },
    { name: "pin", label: "PIN" },
    { name: "pin2", label: "Second PIN" },
  ];
  return onlyForVehicles
    ? fields.map((field) => ({ ...field, showWhen: { field: "category", equals: ["car", "bike"] } }))
    : fields;
}
