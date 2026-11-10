"use client";

import { useState, useRef, useEffect } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { Spinner } from "@/components/ui/spinner";
import { saveGridCell } from "@/lib/actions/data-grid";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";

interface InlineCellProps {
  policyId: string;
  field: string;
  value: string | number | null;
  isCustom?: boolean;
  inputType?: "text" | "date" | "number";
  canEdit?: boolean;
  onSaved?: (field: string, newValue: string, isCustom: boolean) => void;
  className?: string;
  placeholder?: string;
}

export function InlineCell({
  policyId,
  field,
  value,
  isCustom = false,
  inputType = "text",
  canEdit = false,
  onSaved,
  className,
  placeholder = "Empty",
}: InlineCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentVal, setCurrentVal] = useState<string>(value != null ? String(value) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync state if external value changes while not editing
  useEffect(() => {
    if (!isEditing) {
      setCurrentVal(value != null ? String(value) : "");
    }
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputType === "text") {
        inputRef.current.select();
      }
    }
  }, [isEditing, inputType]);

  const handleStartEdit = () => {
    if (!canEdit || saving) return;
    setError(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setCurrentVal(value != null ? String(value) : "");
    setIsEditing(false);
    setError(null);
  };

  const handleSave = async () => {
    const trimmed = currentVal.trim();
    const originalTrimmed = value != null ? String(value).trim() : "";

    // If unchanged, simply exit
    if (trimmed === originalTrimmed) {
      setIsEditing(false);
      setError(null);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await saveGridCell(policyId, field, trimmed, isCustom);
      if (res.ok) {
        setIsEditing(false);
        onSaved?.(field, trimmed, isCustom);
      } else {
        setError(res.message || "Failed to save");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving cell");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    if (inputType === "date") {
      return (
        <div
          className="relative flex items-center min-w-[140px]"
          onKeyDown={(e) => {
            if (e.key === "Escape") handleCancel();
          }}
        >
          <DatePicker
            value={currentVal}
            onChange={async (newIso) => {
              setCurrentVal(newIso);
              setSaving(true);
              setError(null);
              try {
                const res = await saveGridCell(policyId, field, newIso, isCustom);
                if (res.ok) {
                  setIsEditing(false);
                  onSaved?.(field, newIso, isCustom);
                } else {
                  setError(res.message || "Failed to save");
                }
              } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Error saving cell");
              } finally {
                setSaving(false);
              }
            }}
            placeholder="Select date"
            className="h-7 rounded-control px-2 text-xs"
          />
          {saving && (
            <span className="absolute right-8 text-ink-muted">
              <Spinner size={12} />
            </span>
          )}
          {error && (
            <div className="absolute top-full left-0 z-30 mt-1 rounded-[3px] bg-negative px-1.5 py-0.5 text-[10px] text-white shadow-card">
              {error}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="relative flex items-center min-w-[120px]">
        <input
          ref={inputRef}
          type={inputType}
          value={currentVal}
          onChange={(e) => setCurrentVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => void handleSave()}
          disabled={saving}
          className={cn(
            "w-full rounded-control border border-ink bg-surface-strong px-2 py-1 text-xs text-ink font-medium outline-none transition-colors focus:ring-1 focus:ring-ink",
            inputType === "number" ? "tabular-nums text-right" : "",
            error ? "border-negative bg-negative-soft/30" : ""
          )}
        />
        {saving && (
          <span className="absolute right-2 text-ink-muted">
            <Spinner size={12} />
          </span>
        )}
        {error && (
          <div className="absolute top-full left-0 z-30 mt-1 rounded-[3px] bg-negative px-1.5 py-0.5 text-[10px] text-white shadow-card">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Display mode
  let displayValue = currentVal;
  if (inputType === "date" && currentVal) {
    displayValue = formatDate(currentVal);
  } else if (inputType === "number" && currentVal && !isNaN(Number(currentVal))) {
    displayValue = Number(currentVal).toLocaleString("en-IN");
  }

  return (
    <div
      onClick={handleStartEdit}
      title={canEdit ? "Click to edit" : undefined}
      className={cn(
        "group min-h-[26px] flex items-center rounded-[4px] px-2 py-1 text-xs transition-colors select-none",
        canEdit
          ? "cursor-text hover:bg-accent-soft/40 hover:text-ink"
          : "cursor-default text-ink",
        className
      )}
    >
      {displayValue ? (
        <span className={cn("truncate", inputType === "number" ? "tabular-nums" : "")}>
          {displayValue}
        </span>
      ) : (
        <span className="text-[11px] italic text-ink-faint">{placeholder}</span>
      )}
    </div>
  );
}
