export type ColumnType = "text" | "person" | "chip" | "inr" | "date" | "number";

export type Column = {
  key: string;
  label: string;
  type?: ColumnType;
  align?: "left" | "right";
};

export type Row = { id: string } & Record<string, string | number | null | undefined>;

export type Option = { value: string; label: string };

export type FilterDef = { key: string; label: string; options: Option[] };

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "tel" | "email" | "date" | "datetime-local" | "number" | "select" | "textarea" | "file" | "checkbox";
  options?: Option[];
  /** Autocomplete suggestions for a text input (existing values from the database). */
  suggestions?: string[];
  /** File input: accepted extensions or mime types. */
  accept?: string;
  hint?: string;
  required?: boolean;
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

export type PrimaryAction = {
  label: string;
  drawerTitle: string;
  fields: FieldDef[];
  /** Server action that validates and saves the form. */
  action: FormAction;
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

export type TabsDef = { key: string; label: string; options: Option[] };
