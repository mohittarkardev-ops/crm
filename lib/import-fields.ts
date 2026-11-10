export type ImportBatchRecord = {
  id: string;
  kind: "legacy_migration" | "import";
  fileName: string | null;
  totalRows: number;
  insertedRows: number;
  updatedRows: number;
  skippedRows: number;
  status: "running" | "done" | "failed" | "undone";
  notes: string | null;
  createdAt: string;
  finishedAt: string | null;
  createdBy: { full_name: string | null } | null;
};

export type TargetFieldDef = {
  key: string;
  label: string;
  required?: boolean;
  type: "text" | "date" | "number" | "category";
  hint?: string;
};

export const STANDARD_IMPORT_FIELDS: TargetFieldDef[] = [
  { key: "vehicle_reg_no", label: "Vehicle Reg No.", required: true, type: "text", hint: "e.g. DL01AB1234" },
  { key: "owner_name", label: "Owner / Holder Name", required: true, type: "text" },
  { key: "holder_mobile", label: "Mobile Number", type: "text", hint: "Used to auto-link client" },
  { key: "vehicle_category", label: "Vehicle Category", type: "category", hint: "2W, 4W, or CV" },
  { key: "vehicle_make", label: "Vehicle Make", type: "text", hint: "e.g. Maruti, Honda" },
  { key: "vehicle_model", label: "Vehicle Model", type: "text", hint: "e.g. Swift, Activa" },
  { key: "saod_due_date", label: "SAOD (OD) Due Date", type: "date", hint: "YYYY-MM-DD or DD/MM/YYYY" },
  { key: "tp_due_date", label: "TP Due Date", type: "date", hint: "YYYY-MM-DD or DD/MM/YYYY" },
  { key: "due_date", label: "Policy Expiry / Due Date", type: "date" },
  { key: "policy_number", label: "Policy Number", type: "text" },
  { key: "insurer_name", label: "Insurance Company", type: "text" },
  { key: "idv", label: "IDV Amount (₹)", type: "number" },
  { key: "holder_address", label: "Holder Address", type: "text" },
  { key: "vehicle_fuel_type", label: "Fuel Type", type: "text", hint: "Petrol, Diesel, CNG, EV" },
  { key: "vehicle_regn_date", label: "Registration Date", type: "date" },
  { key: "vehicle_chassis_no", label: "Chassis Number", type: "text" },
  { key: "vehicle_engine_no", label: "Engine Number", type: "text" },
  { key: "vehicle_cc", label: "Cubic Capacity (CC)", type: "text" },
  { key: "seating_capacity", label: "Seating Capacity", type: "text" },
  { key: "vehicle_mfy", label: "Manufacturing Year", type: "text", hint: "e.g. 2022" },
  { key: "rto_location", label: "RTO Location", type: "text" },
  { key: "pin", label: "Pincode", type: "text" },
  { key: "pin_2", label: "Second PIN", type: "text" },
];
