"use client";

import { cn } from "@/lib/cn";
import { DatePicker } from "@/components/ui/date-picker";
import { rejectLargeFile } from "@/components/ui/file-guard";
import type { FieldDef } from "@/lib/module-types";

export const CONTROL =
  "w-full rounded-control border border-divider bg-white/80 px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent-strong";

/** Labelled input / select / textarea / file / checkbox with an optional error (design.md 4.6). */
export function Field({
  field,
  error,
  value,
  onFieldChange,
}: {
  field: FieldDef;
  error?: string;
  value?: string;
  onFieldChange?: () => void;
}) {
  const { name, label, type = "text", options, required, full, suggestions, accept, hint } = field;
  const invalid = Boolean(error);
  const control = cn(CONTROL, invalid && "border-negative focus:border-negative");
  const listId = suggestions ? `${name}-suggestions` : undefined;

  if (type === "checkbox") {
    return (
      <label className={cn("flex items-start gap-2.5", full && "sm:col-span-2")}>
        <input
          type="checkbox"
          name={name}
          defaultChecked={value === "on"}
          className="mt-0.5 size-4 shrink-0 accent-[var(--text)]"
        />
        <span className="text-sm text-ink">
          {label}
          {error && <span className="mt-0.5 block text-xs text-negative">{error}</span>}
        </span>
      </label>
    );
  }

  return (
    <label className={cn("flex flex-col gap-1.5", full && "sm:col-span-2")}>
      <span className="text-xs font-medium text-ink-muted">
        {label}
        {required && <span className="text-negative"> *</span>}
      </span>

      {type === "select" ? (
        <select name={name} defaultValue={value ?? ""} aria-invalid={invalid} className={cn(control, "h-10")}>
          {!options?.some((option) => option.value === "") && (
            <option value="" disabled>
              Select
            </option>
          )}
          {options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : type === "date" ? (
        <DatePicker
          name={name}
          defaultValue={value ?? ""}
          invalid={invalid}
          maxToday={field.maxToday}
          onValueChange={onFieldChange}
        />
      ) : type === "textarea" ? (
        <textarea name={name} rows={3} defaultValue={value ?? ""} aria-invalid={invalid} className={cn(control, "py-2.5")} />
      ) : type === "file" ? (
        <input
          name={name}
          type="file"
          accept={accept}
          onChange={rejectLargeFile}
          aria-invalid={invalid}
          className={cn(
            control,
            "h-10 cursor-pointer py-1.5 file:mr-3 file:rounded-[4px] file:border-0 file:bg-ink file:px-3 file:py-1 file:text-xs file:font-medium file:text-white",
          )}
        />
      ) : (
        <>
          <input
            name={name}
            type={type}
            list={listId}
            autoComplete={type === "password" ? "new-password" : undefined}
            defaultValue={value ?? ""}
            aria-invalid={invalid}
            className={cn(control, "h-10")}
          />
          {suggestions && (
            <datalist id={listId}>
              {suggestions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          )}
        </>
      )}

      {error ? (
        <span role="alert" className="text-xs text-negative">
          {error}
        </span>
      ) : (
        hint && <span className="text-xs text-ink-faint">{hint}</span>
      )}
    </label>
  );
}

export function FieldGrid({
  fields,
  errors,
  values,
  watch,
  onFieldChange,
}: {
  fields: FieldDef[];
  errors?: Record<string, string>;
  values?: Record<string, string>;
  /** Live values of the form, used to show or hide fields that depend on another field. */
  watch?: Record<string, string>;
  /** Called when a custom control (such as the date picker) changes a value. */
  onFieldChange?: () => void;
}) {
  const current = { ...values, ...watch };
  const shown = fields.filter(
    (field) => !field.showWhen || field.showWhen.equals.includes(current[field.showWhen.field] ?? ""),
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {shown.map((field) => (
        <Field
          key={field.name}
          field={field}
          error={errors?.[field.name]}
          value={values?.[field.name]}
          onFieldChange={onFieldChange}
        />
      ))}
    </div>
  );
}
