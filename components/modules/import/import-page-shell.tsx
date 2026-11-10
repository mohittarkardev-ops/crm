"use client";

import React, { useState } from "react";
import { Segmented } from "@/components/ui/segmented";
import { ColumnMapper } from "./column-mapper";
import { BulkLookup } from "./bulk-lookup";
import { ImportHistory } from "./import-history";
import type { ImportBatchRecord } from "@/lib/import-fields";

interface ImportPageShellProps {
  customFields: { key: string; label: string }[];
  batches: ImportBatchRecord[];
  canImport: boolean;
  canLookup: boolean;
}

export function ImportPageShell({
  customFields,
  batches,
  canImport,
  canLookup,
}: ImportPageShellProps) {
  const [activeTab, setActiveTab] = useState<"import" | "lookup" | "history">(
    canImport ? "import" : canLookup ? "lookup" : "history",
  );

  const tabOptions = [
    ...(canImport ? [{ value: "import" as const, label: "Bulk Import" }] : []),
    ...(canLookup ? [{ value: "lookup" as const, label: "Bulk Vehicle Lookup" }] : []),
    { value: "history" as const, label: `Import History (${batches.length})` },
  ];

  return (
    <div className="space-y-4">
      {/* Segmented Tab Bar (design.md section 4) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <Segmented
          label="Data Transfer Tabs"
          value={activeTab}
          onChange={(val) => setActiveTab(val)}
          options={tabOptions}
        />
        <p className="text-xs text-ink-muted">
          {activeTab === "import"
            ? "Upload bulk policy matrices with automatic column synonym mapping."
            : activeTab === "lookup"
            ? "Look up and export vehicle policies by registration numbers."
            : "Review and rollback previous bulk import batches."}
        </p>
      </div>

      {/* Tab Panels */}
      {activeTab === "import" && canImport && (
        <ColumnMapper customFields={customFields} />
      )}

      {activeTab === "lookup" && canLookup && (
        <BulkLookup customFields={customFields} />
      )}

      {activeTab === "history" && (
        <ImportHistory batches={batches} canManage={canImport} />
      )}
    </div>
  );
}
