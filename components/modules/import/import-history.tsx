"use client";

import React, { useState } from "react";
import { History, RotateCcw, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import type { ImportBatchRecord } from "@/lib/import-fields";
import { undoImportBatch } from "@/lib/actions/import";
import { formatDate } from "@/lib/format";

interface ImportHistoryProps {
  batches: ImportBatchRecord[];
  canManage: boolean;
}

export function ImportHistory({ batches: initialBatches, canManage }: ImportHistoryProps) {
  const [batches, setBatches] = useState<ImportBatchRecord[]>(initialBatches);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);

  const handleUndo = async (batchId: string) => {
    if (!window.confirm("Are you sure you want to rollback and undo this import? All policies and orphan clients created by this batch will be permanently removed.")) {
      return;
    }

    setUndoingId(batchId);
    setNotice(null);

    try {
      const res = await undoImportBatch(batchId);
      if (res.ok) {
        setBatches((prev) =>
          prev.map((b) => (b.id === batchId ? { ...b, status: "undone" } : b))
        );
        setNotice({ ok: true, message: res.message });
      } else {
        setNotice({ ok: false, message: res.message });
      }
    } catch (err: any) {
      setNotice({ ok: false, message: err.message || "Failed to undo batch." });
    } finally {
      setUndoingId(null);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Recent Import Batches"
        action={
          <span className="text-xs text-ink-muted">
            Showing last {batches.length} runs
          </span>
        }
      />

      {notice && (
        <div
          className={`mb-4 p-3 text-xs flex items-center gap-2 rounded-control ${
            notice.ok ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative"
          }`}
        >
          {notice.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          <span>{notice.message}</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead>
            <tr className="border-b border-divider text-[10px] font-semibold text-ink-muted uppercase tracking-[0.06em]">
              <th className="px-4 pb-2.5">Date</th>
              <th className="px-4 pb-2.5">File Name</th>
              <th className="px-4 pb-2.5 text-right">Total</th>
              <th className="px-4 pb-2.5 text-right">Inserted</th>
              <th className="px-4 pb-2.5 text-right">Updated</th>
              <th className="px-4 pb-2.5 text-right">Skipped</th>
              <th className="px-4 pb-2.5">Status</th>
              <th className="px-4 pb-2.5">By</th>
              {canManage && <th className="px-4 pb-2.5 text-right">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-divider/60">
            {batches.map((b) => (
              <tr key={b.id} className="h-12 border-t border-divider transition-colors hover:bg-accent-soft/40">
                <td className="px-4 py-2.5 font-medium text-ink">
                  {formatDate(b.createdAt.slice(0, 10))}
                </td>
                <td className="px-4 py-2.5 text-ink text-xs truncate max-w-xs">
                  {b.fileName || "—"}
                </td>
                <td className="px-4 py-2.5 text-right font-semibold text-ink tabular-nums">
                  {b.totalRows.toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-2.5 text-right text-positive font-medium tabular-nums">
                  {b.insertedRows.toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-2.5 text-right text-ink font-medium tabular-nums">
                  {b.updatedRows.toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-2.5 text-right text-ink-muted tabular-nums">
                  {b.skippedRows.toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-2.5">
                  <Chip
                    tone={
                      b.status === "done"
                        ? "positive"
                        : b.status === "running"
                        ? "warning"
                        : b.status === "undone"
                        ? "neutral"
                        : "negative"
                    }
                  >
                    {b.status}
                  </Chip>
                </td>
                <td className="px-4 py-2.5 text-ink-muted">
                  {b.createdBy?.full_name || "—"}
                </td>
                {canManage && (
                  <td className="px-4 py-2.5 text-right">
                    {b.status === "done" && (
                      <Button
                        variant="ghost"
                        onClick={() => handleUndo(b.id)}
                        loading={undoingId === b.id}
                        className="h-7 px-2 text-xs text-negative hover:bg-negative-soft hover:text-negative"
                      >
                        <RotateCcw size={12} />
                        Undo
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            ))}

            {batches.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-xs text-ink-muted">
                  No import history found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
