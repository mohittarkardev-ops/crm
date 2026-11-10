"use client";

import { useState, useRef, useEffect } from "react";
import { Check } from "lucide-react";
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
  onSaved?: (field: string, newValue: string, isCustom: boolean, meta?: Record<string, string>) => void;
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
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorPulse, setErrorPulse] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const savedTimerRef = useRef<number | null>(null);
  // True once a date was chosen in the calendar, so closing it afterwards is not treated as a cancel.
  const pickedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
    };
  }, []);

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
    pickedRef.current = false;
    setIsEditing(true);
  };

  const handleCancel = () => {
    setCurrentVal(value != null ? String(value) : "");
    setIsEditing(false);
    setError(null);
  };

  const persistValue = async (nextVal: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await saveGridCell(policyId, field, nextVal, isCustom);
      if (res.ok) {
        const finalVal = res.values?.savedValue ?? nextVal;
        setCurrentVal(finalVal);
        setIsEditing(false);
        setJustSaved(true);
        if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
        savedTimerRef.current = window.setTimeout(() => setJustSaved(false), 1100);
        onSaved?.(field, finalVal, isCustom, res.values);
      } else {
        setError(res.error || res.message || "Failed to save");
        setErrorPulse((n) => n + 1);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving cell");
      setErrorPulse((n) => n + 1);
    } finally {
      setSaving(false);
    }
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

    await persistValue(trimmed);
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
            onChange={(newIso) => {
              pickedRef.current = true;
              setCurrentVal(newIso);
              void persistValue(newIso);
            }}
            placeholder="Select date"
            defaultOpen
            onOpenChange={(isOpen) => {
              if (!isOpen && !pickedRef.current) handleCancel();
            }}
            className="h-7 rounded-control px-2 text-xs"
          />
          {saving && (
            <span className="absolute right-8 text-ink-muted">
              <Spinner size={12} />
            </span>
          )}
          {error && (
            <div key={errorPulse} className="micro-shake absolute top-full left-0 z-30 mt-1 rounded-[3px] bg-negative px-1.5 py-0.5 text-[10px] text-white shadow-card">
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
          <div key={errorPulse} className="micro-shake absolute top-full left-0 z-30 mt-1 rounded-[3px] bg-negative px-1.5 py-0.5 text-[10px] text-white shadow-card">
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
        "group min-h-[26px] flex items-center justify-between gap-1.5 rounded-[4px] px-2 py-1 text-xs transition-colors select-none",
        canEdit
          ? "cursor-text hover:bg-accent-soft/40 hover:text-ink"
          : "cursor-default text-ink",
        justSaved && "flash-positive",
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
      {justSaved && <Check size={12} strokeWidth={2.5} className="check-pop shrink-0 text-positive" aria-hidden="true" />}
    </div>
  );
}
