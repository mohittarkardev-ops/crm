import type { FieldDef, Option } from "@/lib/module-types";

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
