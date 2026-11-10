import type { ReactNode } from "react";

export type ColumnType = "text" | "person" | "chip" | "inr" | "date" | "number" | "image" | "insurer";

export type Column = {
  key: string;
  label: string;
  type?: ColumnType;
  align?: "left" | "right";
};

export type Row = { id: string } & Record<string, string | number | null | undefined>;

export type Option = {
  value: string;
  label: string;
  hint?: string;
  logoUrl?: string | null;
  showBadge?: boolean;
};

export type FilterDef = { key: string; label: string; options: Option[] };

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "tel" | "email" | "password" | "date" | "datetime-local" | "number" | "select" | "textarea" | "file" | "checkbox";
  options?: Option[];
  /** Autocomplete suggestions for a text input (existing values from the database). */
  suggestions?: string[];
  /** File input: accepted extensions or mime types. */
  accept?: string;
  hint?: string;
  required?: boolean;
  /** Date fields: dates after today cannot be picked (for example a date of birth). */
  maxToday?: boolean;
  /** Show this field only when another field has one of these values (for example audience = expiring). */
  showWhen?: { field: string; equals: string[] };
  /** Spans both columns of the form grid. */
  full?: boolean;
};

/** Result returned by every server action that saves something. */
export type ActionState = {
  ok: boolean;
  /** Form-level error shown above the fields. */
  error?: string;
  /** Per-field errors, keyed by field name. */
  fieldErrors?: Record<string, string>;
  /** Success message shown as a toast. */
  message?: string;
  /** Submitted text values, so the form keeps what was typed after an error. */
  values?: Record<string, string>;
  /** Where to go after a successful save (for example the new policy). */
  redirectTo?: string;
};

export type FormAction = (previous: ActionState, formData: FormData) => Promise<ActionState>;

/** Result of a "check before saving" step, for example how many people a notification would reach. */
export type PreviewResult = {
  ok: boolean;
  error?: string;
  summary?: string;
  /** Text the staff member can copy (for example mobile numbers to message on WhatsApp). */
  copyText?: string;
  copyLabel?: string;
};

export type PrimaryAction = {
  label: string;
  drawerTitle: string;
  fields: FieldDef[];
  /** Optional initial values when opening the Create drawer. */
  defaultValues?: Record<string, string>;
  /** Server action that validates and saves the form. */
  action: FormAction;
  /** Optional "Check recipients" step shown next to Save. */
  preview?: (formData: FormData) => Promise<PreviewResult>;
  /** Optional dynamic banner rendered above fields from live watched form values. */
  header?: (values: Record<string, string>) => ReactNode;
};

/** Per-row button, for example "Remove" or "Turn off". The action receives the row id. */
export type RowAction = {
  label: string;
  action: (id: string) => Promise<ActionState>;
  confirm?: string;
  danger?: boolean;
  /** Only show the button for rows where row[key] is one of these values. */
  showWhen?: { key: string; in: string[] };
};

/**
 * Edit button on every row. The form opens filled with the row's values: each field is pre-filled from the row key
 * with the same name as the field, so rows must carry the editable values.
 */
export type EditAction = {
  drawerTitle: string;
  fields: FieldDef[];
  action: (id: string, previous: ActionState, formData: FormData) => Promise<ActionState>;
  /** Only show the Edit button when row[key] is one of these values (e.g. pending claims only). */
  showWhen?: { key: string; in: string[] };
};

export type TabsDef = { key: string; label: string; options: Option[] };
