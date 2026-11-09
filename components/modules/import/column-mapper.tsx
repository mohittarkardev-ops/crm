"use client";

import React, { useState, useRef, useMemo } from "react";
import Link from "next/link";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  RotateCcw,
  SlidersHorizontal,
  TableProperties,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CustomSelect } from "@/components/ui/custom-select";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import {
  STANDARD_IMPORT_FIELDS,
  type TargetFieldDef,
} from "@/lib/import-fields";
import {
  startImportBatch,
  importChunk,
  finishImportBatch,
} from "@/lib/actions/import";
import { cn } from "@/lib/cn";

interface ColumnMapperProps {
  customFields: { key: string; label: string }[];
}

// Synonyms map to auto-suggest target fields from raw headers
const SYNONYMS: Record<string, string[]> = {
  vehicle_reg_no: [
    "reg no", "registration no", "registration number", "reg_no", "vehicle no",
    "vehicle_no", "vehicleno", "rc no", "registration_no", "vehicle registration no",
    "vehicle reg no", "regno",
  ],
  owner_name: [
    "owner name", "owner", "customer name", "name", "customer", "insured name",
    "client name", "holder name", "holder_name", "insured",
  ],
  holder_mobile: [
    "mobile", "mobile number", "contact", "phone", "contact number", "mobile_number",
    "customer mobile", "phone number", "holder_mobile", "cell",
  ],
  vehicle_category: [
    "category", "vehicle category", "vehicle_category", "type", "vehicle type",
    "2w/4w", "group", "class",
  ],
  vehicle_make: [
    "make", "manufacturer", "vehicle make", "vehicle_make", "manufacturer name", "brand",
  ],
  vehicle_model: [
    "model", "vehicle model", "vehicle_model", "variant", "model & varient", "model & variant",
  ],
  saod_due_date: [
    "saod due date", "saod_due_date", "saod due", "od due date", "od due",
    "insurance due date", "saod", "od expiry",
  ],
  tp_due_date: [
    "tp due date", "tp_due_date", "tp due", "third party due", "third party due date",
    "tp", "tp expiry",
  ],
  due_date: [
    "due date", "due_date", "expiry date", "expiry", "end date", "renewal date", "policy expiry",
  ],
  policy_number: [
    "policy no", "policy number", "policy_no", "policy_number", "policyno", "policy",
  ],
  insurer_name: [
    "insurer", "insurance company", "insurance company name", "company",
    "insurance_company", "insurer name", "company name",
  ],
  idv: ["idv", "insured declared value", "idv amount", "idv (rs)"],
  holder_address: [
    "address", "permanent address", "holder address", "customer address", "city",
  ],
  vehicle_fuel_type: ["fuel", "fuel type", "vehicle_fuel_type"],
  vehicle_regn_date: [
    "registration date", "reg date", "regn date", "vehicle_regn_date", "purchase date",
  ],
  vehicle_chassis_no: ["chassis", "chassis no", "chassis_no", "chasis no", "vin"],
  vehicle_engine_no: ["engine", "engine no", "engine_no", "motor no"],
  vehicle_cc: ["cc", "cubic capacity", "cubic_capacity", "engine cc"],
  seating_capacity: ["seating capacity", "seating cap", "seating_capacity", "seats"],
  rto_location: ["rto", "rto location", "rto_location", "city rto"],
  pin: ["pin", "pincode", "postal code", "zip"],
  pin_2: ["pin 2", "pin_2", "second pin"],
};

function autoMatchHeader(header: string): string {
  const clean = header.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
  for (const [targetKey, syns] of Object.entries(SYNONYMS)) {
    if (syns.some((s) => clean === s || clean.includes(s) || s.includes(clean))) {
      return targetKey;
    }
  }
  return ""; // Unmapped / Ignore
}

const CHUNK_SIZE = 250;

export function ColumnMapper({ customFields }: ColumnMapperProps) {
  // Step 1: File selection
  // Step 2: Column mapping & Preview
  // Step 3: Chunked uploading with progress
  // Step 4: Finished summary
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [file, setFile] = useState<File | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);

  // Mapping state: { [fileHeader]: targetFieldKey }
  const [mappings, setMappings] = useState<Record<string, string>>({});

  // Configuration options
  const [updateExisting, setUpdateExisting] = useState(true);
  const [autoLinkClients, setAutoLinkClients] = useState(true);

  // Upload progress state
  const [batchId, setBatchId] = useState<string | null>(null);
  const [processedChunks, setProcessedChunks] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [stats, setStats] = useState({ inserted: 0, updated: 0, skipped: 0 });
  const [errorLogs, setErrorLogs] = useState<string[]>([]);
  const [isAborted, setIsAborted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // All available target options (standard + dynamic custom fields)
  const availableTargetOptions = useMemo(() => {
    const list: { key: string; label: string; group: string }[] = [
      { key: "", label: "— Ignore this column —", group: "System" },
      ...STANDARD_IMPORT_FIELDS.map((f) => ({
        key: f.key,
        label: `${f.label}${f.required ? " *" : ""}`,
        group: "Standard Fields",
      })),
      ...customFields.map((c) => ({
        key: c.key,
        label: c.label,
        group: "Custom Dynamic Fields",
      })),
    ];
    return list;
  }, [customFields]);

  // Handle file reading
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    try {
      // Dynamic import of xlsx
      const XLSX = await import("xlsx");
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
        defval: "",
        raw: false, // get formatted text
      });

      if (jsonRows.length === 0) {
        toast("The selected file is empty.", "error");
        setFile(null);
        return;
      }

      // Extract headers from first row
      const detectedHeaders = Object.keys(jsonRows[0]);
      setRawHeaders(detectedHeaders);
      setParsedRows(jsonRows);

      // Perform automatic synonym matching
      const initialMap: Record<string, string> = {};
      const usedTargets = new Set<string>();

      detectedHeaders.forEach((hdr) => {
        const match = autoMatchHeader(hdr);
        if (match && !usedTargets.has(match)) {
          initialMap[hdr] = match;
          usedTargets.add(match);
        } else {
          initialMap[hdr] = "";
        }
      });

      setMappings(initialMap);
      setStep(2);
    } catch (err: any) {
      console.error("File parse error:", err);
      toast(`Could not parse file: ${err.message}`, "error");
      setFile(null);
    }
  };

  const handleMappingChange = (header: string, targetKey: string) => {
    setMappings((prev) => ({
      ...prev,
      [header]: targetKey,
    }));
  };

  // Preview data transformation
  const previewData = useMemo(() => {
    if (parsedRows.length === 0) return [];
    return parsedRows.slice(0, 3).map((row) => {
      const out: Record<string, any> = {};
      for (const [header, targetKey] of Object.entries(mappings)) {
        if (targetKey) {
          out[targetKey] = row[header];
        }
      }
      return out;
    });
  }, [parsedRows, mappings]);

  // Check if mandatory fields are mapped
  const missingRequired = useMemo(() => {
    const selectedTargetKeys = new Set(Object.values(mappings));
    const missing: string[] = [];
    // Must have vehicle_reg_no or policy_number
    if (!selectedTargetKeys.has("vehicle_reg_no") && !selectedTargetKeys.has("policy_number")) {
      missing.push("Either 'Vehicle Reg No.' or 'Policy Number' must be mapped.");
    }
    return missing;
  }, [mappings]);

  // Start chunked import execution
  const executeImport = async () => {
    if (missingRequired.length > 0 || !file) return;

    setStep(3);
    setProcessedChunks(0);
    setErrorLogs([]);
    setStats({ inserted: 0, updated: 0, skipped: 0 });

    // 1. Initialize batch in database
    const batchRes = await startImportBatch(file.name, parsedRows.length);
    if (!batchRes.ok) {
      toast(batchRes.error, "error");
      setStep(2);
      return;
    }

    const currentBatchId = batchRes.batchId;
    setBatchId(currentBatchId);

    // 2. Map all rows according to the chosen mapping
    const mappedRecords = parsedRows.map((rawRow) => {
      const mappedRow: Record<string, any> = {};
      for (const [header, targetKey] of Object.entries(mappings)) {
        if (targetKey && rawRow[header] !== undefined) {
          mappedRow[targetKey] = rawRow[header];
        }
      }
      return mappedRow;
    });

    const total = Math.ceil(mappedRecords.length / CHUNK_SIZE);
    setTotalChunks(total);

    let accumulatedInserted = 0;
    let accumulatedUpdated = 0;
    let accumulatedSkipped = 0;
    const accumulatedErrors: string[] = [];

    // 3. Process chunks sequentially
    for (let c = 0; c < total; c++) {
      if (isAborted) break;

      const chunkRows = mappedRecords.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE);
      try {
        const chunkRes = await importChunk(currentBatchId, chunkRows, {
          updateExisting,
          autoLinkClients,
        });

        accumulatedInserted += chunkRes.inserted;
        accumulatedUpdated += chunkRes.updated;
        accumulatedSkipped += chunkRes.skipped;
        if (chunkRes.errors && chunkRes.errors.length > 0) {
          accumulatedErrors.push(...chunkRes.errors);
        }

        setStats({
          inserted: accumulatedInserted,
          updated: accumulatedUpdated,
          skipped: accumulatedSkipped,
        });
        setErrorLogs([...accumulatedErrors]);
      } catch (err: any) {
        accumulatedErrors.push(`Chunk ${c + 1} fatal error: ${err.message}`);
        setErrorLogs([...accumulatedErrors]);
      }

      setProcessedChunks(c + 1);
    }

    // 4. Finish batch
    const status = accumulatedErrors.length > total * 5 ? "failed" : "done";
    await finishImportBatch(
      currentBatchId,
      status,
      `Imported: ${accumulatedInserted}, Updated: ${accumulatedUpdated}, Skipped: ${accumulatedSkipped}`
    );

    setStep(4);
  };

  const progressPercentage =
    totalChunks > 0 ? Math.round((processedChunks / totalChunks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Step 1: Upload Dropzone */}
      {step === 1 && (
        <Card className="p-8 text-center">
          <div className="mx-auto max-w-lg space-y-4">
            <div className="mx-auto grid size-12 place-items-center rounded-control bg-surface-muted text-ink">
              <UploadCloud size={24} strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink">Select a file to import</h2>
              <p className="text-xs text-ink-muted mt-1">
                Upload CSV, Excel (.xlsx, .xls), or JSON. Header names will be matched automatically.
              </p>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer rounded-card border-2 border-dashed border-divider p-8 hover:border-ink hover:bg-surface-muted/30 transition-all"
            >
              <FileSpreadsheet size={32} className="mx-auto text-ink-faint mb-2" />
              <p className="text-xs font-semibold text-ink">Click to browse your computer</p>
              <p className="text-[11px] text-ink-faint mt-0.5">Supports files up to 200,000+ rows</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls, .json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Step 2: Smart Column Mapper & Preview */}
      {step === 2 && file && (
        <div className="space-y-4">
          {/* Summary Banner */}
          <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">Map Columns — {file.name}</h2>
              <p className="text-xs text-ink-muted">
                {parsedRows.length.toLocaleString("en-IN")} rows detected. Verify the detected column mappings below.
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setFile(null);
                setStep(1);
              }}
              className="h-8 px-3 text-xs"
            >
              <RotateCcw size={13} className="mr-1.5" />
              Choose different file
            </Button>
          </Card>

          {/* Options & Settings */}
          <Card className="p-4">
            <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">
              Import Configuration
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-ink">
                <input
                  type="checkbox"
                  checked={updateExisting}
                  onChange={(e) => setUpdateExisting(e.target.checked)}
                  className="rounded border-divider text-ink focus:ring-0 mt-0.5 accent-[var(--text)]"
                />
                <div>
                  <span className="font-semibold block">Update existing policies</span>
                  <span className="text-[11px] text-ink-muted">
                    If registration no. or policy no. already exists, update its details instead of skipping.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-ink">
                <input
                  type="checkbox"
                  checked={autoLinkClients}
                  onChange={(e) => setAutoLinkClients(e.target.checked)}
                  className="rounded border-divider text-ink focus:ring-0 mt-0.5 accent-[var(--text)]"
                />
                <div>
                  <span className="font-semibold block">Auto-link Client Accounts</span>
                  <span className="text-[11px] text-ink-muted">
                    Automatically match or create user profile by mobile number (+91XXXXXXXXXX).
                  </span>
                </div>
              </label>
            </div>
          </Card>

          {/* Mapping Table */}
          <Card className="p-5">
            <CardHeader
              title={`Header Mapping (${rawHeaders.length} columns)`}
              action={
                <span className="text-xs text-ink-muted">
                  Unmapped columns will be ignored or skipped
                </span>
              }
            />

            <div className="overflow-x-auto max-h-[380px]">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-surface border-b border-divider text-[10px] font-semibold text-ink-muted uppercase tracking-[0.06em]">
                  <tr>
                    <th className="px-4 pb-2.5">File Column</th>
                    <th className="px-4 pb-2.5">Sample Value (Row 1)</th>
                    <th className="px-4 pb-2.5">Target CRM Field</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider/60">
                  {rawHeaders.map((hdr) => {
                    const mappedKey = mappings[hdr] || "";
                    const sampleVal = parsedRows[0]?.[hdr];
                    const isMapped = Boolean(mappedKey);

                    return (
                      <tr
                        key={hdr}
                        className={cn(
                          "transition-colors hover:bg-accent-soft/40",
                          isMapped ? "bg-surface" : "bg-surface-muted/20 opacity-70"
                        )}
                      >
                        <td className="px-4 py-2.5 font-medium text-ink">{hdr}</td>
                        <td className="px-4 py-2.5 text-ink-muted text-xs max-w-xs truncate tabular-nums">
                          {sampleVal ? String(sampleVal) : <span className="text-ink-faint italic">—</span>}
                        </td>
                        <td className="px-4 py-2">
                          <CustomSelect
                            value={mappedKey}
                            onChange={(val) => handleMappingChange(hdr, val)}
                            options={availableTargetOptions.map((opt) => ({
                              value: opt.key,
                              label: opt.label,
                            }))}
                            placeholder="— Ignore this column —"
                            searchable
                            className="h-8 w-full max-w-xs text-xs"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Validation Errors if any */}
          {missingRequired.length > 0 && (
            <div className="flex items-center gap-2 rounded-card bg-negative-soft px-4 py-3 text-xs text-negative">
              <AlertCircle size={16} />
              <span>{missingRequired[0]}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setFile(null);
                setStep(1);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={executeImport}
              disabled={missingRequired.length > 0}
              className="min-w-44"
            >
              Start Bulk Import
              <ArrowRight size={14} className="ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Chunked Progress Screen */}
      {step === 3 && (
        <Card className="p-8 text-center space-y-6">
          <div className="max-w-md mx-auto space-y-3">
            <div className="flex justify-center">
              <Spinner size={32} />
            </div>
            <h2 className="text-base font-semibold text-ink">Importing Records...</h2>
            <p className="text-xs text-ink-muted">
              Processing chunk {processedChunks} of {totalChunks} ({progressPercentage}%)
            </p>

            {/* Progress Track */}
            <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden border border-divider">
              <div
                className="h-full bg-accent-strong transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            {/* Counters */}
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-divider text-left">
              <div className="rounded-[4px] bg-surface-muted p-2 text-center">
                <span className="block text-sm font-bold text-ink">{stats.inserted}</span>
                <span className="text-[10px] uppercase font-semibold text-ink-muted">Inserted</span>
              </div>
              <div className="rounded-[4px] bg-surface-muted p-2 text-center">
                <span className="block text-sm font-bold text-ink">{stats.updated}</span>
                <span className="text-[10px] uppercase font-semibold text-ink-muted">Updated</span>
              </div>
              <div className="rounded-[4px] bg-surface-muted p-2 text-center">
                <span className="block text-sm font-bold text-ink">{stats.skipped}</span>
                <span className="text-[10px] uppercase font-semibold text-ink-muted">Skipped</span>
              </div>
            </div>
          </div>

          {/* Error messages if any */}
          {errorLogs.length > 0 && (
            <div className="max-w-xl mx-auto rounded-tile bg-negative-soft p-3 text-left">
              <p className="text-xs font-semibold text-negative mb-1">
                Errors encountered ({errorLogs.length}):
              </p>
              <div className="max-h-28 overflow-y-auto space-y-0.5 text-[11px] text-negative">
                {errorLogs.slice(-10).map((err, i) => (
                  <p key={i}>• {err}</p>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Step 4: Finished Summary */}
      {step === 4 && (
        <Card className="p-8 text-center space-y-6">
          <div className="max-w-md mx-auto space-y-4">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-positive-soft text-positive">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink">Import Batch Complete!</h2>
              <p className="text-xs text-ink-muted mt-1">
                Successfully processed all rows for {file?.name}.
              </p>
            </div>

            {/* Final Stats */}
            <div className="grid grid-cols-3 gap-3 pt-2 text-left">
              <div className="rounded-tile border border-divider bg-surface-muted/40 p-3 text-center">
                <span className="block text-lg font-bold text-positive">{stats.inserted}</span>
                <span className="text-[10px] uppercase font-semibold text-ink-muted">New Policies</span>
              </div>
              <div className="rounded-tile border border-divider bg-surface-muted/40 p-3 text-center">
                <span className="block text-lg font-bold text-ink">{stats.updated}</span>
                <span className="text-[10px] uppercase font-semibold text-ink-muted">Updated</span>
              </div>
              <div className="rounded-tile border border-divider bg-surface-muted/40 p-3 text-center">
                <span className="block text-lg font-bold text-ink-muted">{stats.skipped}</span>
                <span className="text-[10px] uppercase font-semibold text-ink-muted">Skipped</span>
              </div>
            </div>

            {/* Error logs review */}
            {errorLogs.length > 0 && (
              <div className="rounded-tile bg-negative-soft p-3 text-left">
                <p className="text-xs font-semibold text-negative mb-1">
                  Note: {errorLogs.length} rows were skipped due to format issues.
                </p>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link href="/data-grid" className="w-full sm:w-auto">
                <Button className="w-full">
                  <TableProperties size={14} className="mr-1.5" />
                  Open in Data Grid
                </Button>
              </Link>
              <Button
                variant="secondary"
                onClick={() => {
                  setFile(null);
                  setStep(1);
                  setStats({ inserted: 0, updated: 0, skipped: 0 });
                  setErrorLogs([]);
                }}
                className="w-full sm:w-auto"
              >
                Import Another File
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
