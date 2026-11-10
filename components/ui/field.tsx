"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { CustomSelect } from "@/components/ui/custom-select";
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
  className,
}: {
  field: FieldDef;
  error?: string;
  value?: string;
  onFieldChange?: (name?: string, value?: string) => void;
  className?: string;
}) {
  const { name, label, type = "text", options, required, full, suggestions, accept, hint } = field;
  const invalid = Boolean(error);
  const control = cn(CONTROL, invalid && "border-negative focus:border-negative");
  const listId = suggestions ? `${name}-suggestions` : undefined;
  const isComposite = type === "select" || type === "date";

  if (type === "checkbox") {
    return (
      <label className={cn("flex items-start gap-2.5", full && "sm:col-span-2", className)}>
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

  const Wrapper = isComposite ? "div" : "label";

  return (
    <Wrapper className={cn("flex flex-col gap-1.5", full && "sm:col-span-2", className)}>
      <span className="text-xs font-medium text-ink-muted">
        {label}
        {required && <span className="text-negative"> *</span>}
      </span>

      {type === "select" ? (
        <CustomSelect
          name={name}
          defaultValue={value ?? ""}
          options={options ?? []}
          placeholder="Select an option"
          invalid={invalid}
          onValueChange={(val) => onFieldChange?.(name, val)}
        />
      ) : type === "date" ? (
        <DatePicker
          name={name}
          defaultValue={value ?? ""}
          invalid={invalid}
          maxToday={field.maxToday}
          onValueChange={(val) => onFieldChange?.(name, val)}
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
    </Wrapper>
  );
}

export function FieldGrid({
  fields,
  errors,
  values,
  contextValues,
  watch,
  onFieldChange,
}: {
  fields: FieldDef[];
  errors?: Record<string, string>;
  values?: Record<string, string>;
  /** Extra non-submitted row context (e.g. `agentState`, `isSelf`) used only for `showWhen` evaluation. */
  contextValues?: Record<string, string>;
  /** Live values of the form, used to show or hide fields that depend on another field. */
  watch?: Record<string, string>;
  /** Called when a custom control (such as CustomSelect or DatePicker) commits a changed value. */
  onFieldChange?: (name?: string, value?: string) => void;
}) {
  const current = { ...contextValues, ...values, ...watch };
  const shown = fields.filter(
    (field) => !field.showWhen || field.showWhen.equals.includes(current[field.showWhen.field] ?? ""),
  );
  const [initialNames] = useState(() => new Set(shown.map((f) => f.name)));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {shown.map((field) => (
        <Field
          key={field.name}
          field={field}
          error={errors?.[field.name]}
          value={values?.[field.name]}
          onFieldChange={onFieldChange}
          className={!initialNames.has(field.name) ? "reveal-down" : undefined}
        />
      ))}
    </div>
  );
}
