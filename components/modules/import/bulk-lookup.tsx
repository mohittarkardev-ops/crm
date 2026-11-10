"use client";

import React, { useState, useRef } from "react";
import {
  FileSearch,
  Download,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Segmented } from "@/components/ui/segmented";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/cn";
import { bulkLookupPolicies } from "@/lib/actions/import";

interface BulkLookupProps {
  customFields: { key: string; label: string }[];
}

const BASE_EXPORT_COLUMNS = [
  { key: "vehicle_reg_no", label: "Registration No." },
  { key: "vehicle_category", label: "Category (2W/4W/CV)" },
  { key: "owner_name", label: "Owner Name" },
  { key: "holder_mobile", label: "Mobile Number" },
  { key: "vehicle_make", label: "Make" },
  { key: "vehicle_model", label: "Model" },
  { key: "vehicle_fuel_type", label: "Fuel Type" },
  { key: "policy_number", label: "Policy Number" },
  { key: "insurer_name", label: "Insurance Company" },
  { key: "idv", label: "IDV Amount" },
  { key: "saod_due_date", label: "SAOD Due Date" },
  { key: "tp_due_date", label: "TP Due Date" },
  { key: "due_date", label: "Due Date" },
  { key: "holder_address", label: "Address" },
  { key: "vehicle_chassis_no", label: "Chassis No." },
  { key: "vehicle_engine_no", label: "Engine No." },
];

export function BulkLookup({ customFields }: BulkLookupProps) {
  const [inputText, setInputText] = useState("");
  const [selectedCols, setSelectedCols] = useState<Set<string>>(
    new Set([
      "vehicle_reg_no",
      "vehicle_category",
      "owner_name",
      "holder_mobile",
      "vehicle_make",
      "vehicle_model",
      "policy_number",
      "insurer_name",
      "due_date",
    ])
  );
  const [format, setFormat] = useState<"csv" | "excel">("csv");
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [unmatchedList, setUnmatchedList] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const allColumns = [
    ...BASE_EXPORT_COLUMNS,
    ...customFields.map((c) => ({ key: c.key, label: c.label })),
  ];

  const loadIdentifierFile = async (file: File) => {
    try {
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
        const flatList = data
          .map((row) => (row[0] != null ? String(row[0]).trim() : ""))
          .filter(Boolean);
        setInputText(flatList.join("\n"));
      } else {
        const text = await file.text();
        const lines = text
          .split(/\r?\n/)
          .map((l) => l.split(",")[0].replace(/^"|"$/g, "").trim())
          .filter(Boolean);
        setInputText(lines.join("\n"));
      }
      setNotice(null);
      toast(`Loaded identifiers from ${file.name}.`);
    } catch (err: any) {
      setNotice({ ok: false, message: `Could not read file: ${err.message}` });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    await loadIdentifierFile(e.target.files[0]);
  };

  const toggleColumn = (key: string) => {
    setSelectedCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAllColumns = () => {
    if (selectedCols.size === allColumns.length) {
      setSelectedCols(new Set(["vehicle_reg_no"]));
    } else {
      setSelectedCols(new Set(allColumns.map((c) => c.key)));
    }
  };

  const handleExecuteLookup = async () => {
    const lines = inputText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length >= 3);

    if (lines.length === 0) {
      setNotice({ ok: false, message: "Please paste or upload at least one registration number or policy number." });
      return;
    }

    if (selectedCols.size === 0) {
      setNotice({ ok: false, message: "Please select at least one column to export." });
      return;
    }

    setLoading(true);
    setNotice(null);
    setUnmatchedList([]);

    try {
      const colList = Array.from(selectedCols);
      const res = await bulkLookupPolicies(lines, colList);

      if (!res.ok) {
        setNotice({ ok: false, message: res.error });
        return;
      }

      setUnmatchedList(res.unmatched);

      if (res.rows.length === 0) {
        setNotice({
          ok: false,
          message: `0 records matched out of ${res.searchedCount} unique identifiers searched.`,
        });
        return;
      }

      // Generate File (CSV or Excel)
      const columnLabels = colList.map(
        (key) => allColumns.find((c) => c.key === key)?.label || key
      );

      if (format === "excel") {
        const XLSX = await import("xlsx");
        const formattedData = res.rows.map((row) => {
          const item: Record<string, any> = {};
          colList.forEach((colKey, i) => {
            item[columnLabels[i]] = row[colKey] ?? "";
          });
          return item;
        });

        const worksheet = XLSX.utils.json_to_sheet(formattedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Enriched Policies");
        XLSX.writeFile(
          workbook,
          `bulk_lookup_export_${new Date().toISOString().slice(0, 10)}.xlsx`
        );
      } else {
        // CSV with formula-injection neutralization
        const escape = (val: any) => {
          let s = val != null ? String(val) : "";
          if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
          return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        };

        const csvLines = [
          columnLabels.map(escape).join(","),
          ...res.rows.map((row) => colList.map((col) => escape(row[col])).join(",")),
        ];

        const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bulk_lookup_export_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      const unmatchedNote =
        res.unmatched.length > 0 ? ` (${res.unmatched.length} not found)` : "";
      setNotice({
        ok: true,
        message: `Matched and exported ${res.rows.length} policies across ${res.searchedCount} unique identifiers${unmatchedNote}.`,
      });
    } catch (err: any) {
      setNotice({ ok: false, message: `Lookup error: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const lineCount = inputText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean).length;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <CardHeader
          title="Bulk Vehicle Lookup & Exporter"
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 px-3 text-xs"
              >
                <FileSpreadsheet size={14} className="mr-1.5" />
                Upload List File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls, .txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          }
        />

        <div className="grid gap-6 md:grid-cols-2 pt-2">
          {/* Left: Input Textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-ink">
                Identifiers (Reg No. or Policy No.)
              </label>
              <span className="text-[11px] text-ink-muted">
                {lineCount > 0 ? `${lineCount} identifiers entered` : "One per line"}
              </span>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onDragEnter={(e) => {
                if (!e.dataTransfer?.types?.includes("Files")) return;
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(e) => {
                if (!e.dataTransfer?.types?.includes("Files")) return;
                e.preventDefault();
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={async (e) => {
                e.preventDefault();
                setIsDragging(false);
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) await loadIdentifierFile(dropped);
              }}
              placeholder="DL01AB1234&#10;HR26CD5678&#10;UP85XY9999&#10;&#10;(Or drop a .csv / .xlsx / .txt file here)"
              rows={12}
              className={cn(
                "w-full rounded-control border p-3 text-xs text-ink uppercase tracking-wide placeholder:text-ink-faint outline-none transition-[border-color,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                isDragging
                  ? "border-accent-strong bg-accent-soft/45"
                  : "border-divider bg-surface-strong focus:border-accent-strong",
              )}
            />
          </div>

          {/* Right: Column Selector & Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink">
                Select Columns to Export ({selectedCols.size}/{allColumns.length})
              </span>
              <button
                type="button"
                onClick={toggleAllColumns}
                className="text-[11px] font-semibold text-ink-muted hover:text-ink underline"
              >
                {selectedCols.size === allColumns.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto p-2 rounded-tile border border-divider bg-surface-muted/20">
              {allColumns.map((col) => {
                const checked = selectedCols.has(col.key);
                return (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 cursor-pointer text-xs text-ink-muted hover:text-ink select-none"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleColumn(col.key)}
                      className="rounded border-divider text-ink focus:ring-0 accent-[var(--text)]"
                    />
                    <span className="truncate">{col.label}</span>
                  </label>
                );
              })}
            </div>

            {/* Format Selector */}
            <div className="pt-2 border-t border-divider flex items-center justify-between">
              <span className="text-xs font-medium text-ink">Export Format:</span>
              <Segmented
                label="Export format"
                value={format}
                onChange={setFormat}
                options={[
                  { value: "csv" as const, label: "CSV" },
                  { value: "excel" as const, label: "Excel (.xlsx)" },
                ]}
              />
            </div>

            <Button
              onClick={handleExecuteLookup}
              loading={loading}
              disabled={lineCount === 0}
              className="w-full"
            >
              <Download size={14} className="mr-1.5" />
              Download Enriched {format === "excel" ? "Excel" : "CSV"}
            </Button>
          </div>
        </div>

        {notice && (
          <div
            className={`mt-4 flex flex-col gap-2 rounded-tile p-3 text-xs ${
              notice.ok ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative"
            }`}
          >
            <div className="flex items-center gap-2">
              {notice.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{notice.message}</span>
            </div>
            {unmatchedList.length > 0 && (
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-divider/40 pt-2 text-[11px] text-ink">
                <span className="truncate max-w-xl select-text">
                  Not found ({unmatchedList.length}): {unmatchedList.slice(0, 10).join(", ")}
                  {unmatchedList.length > 10 ? ` … (+${unmatchedList.length - 10} more)` : ""}
                </span>
                <CopyButton
                  text={unmatchedList.join("\n")}
                  label="Copy unmatched list"
                  copiedLabel="Copied list"
                  toastMessage="Copied unmatched identifiers."
                  errorMessage="Could not copy automatically."
                  className="shrink-0"
                />
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
