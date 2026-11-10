"use client";

import React, { useState } from "react";
import { RotateCcw, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { buttonStyles } from "@/components/ui/button";
import { RelaxedEmptyCharacter, RollbackGuardCharacter } from "@/components/ui/characters";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import type { ImportBatchRecord } from "@/lib/import-fields";
import { undoImportBatch } from "@/lib/actions/import";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";

interface ImportHistoryProps {
  batches: ImportBatchRecord[];
  canManage: boolean;
}

export function ImportHistory({ batches: initialBatches, canManage }: ImportHistoryProps) {
  const [batches, setBatches] = useState<ImportBatchRecord[]>(initialBatches);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [flashedId, setFlashedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);

  const handleUndo = async (batchId: string) => {
    setUndoingId(batchId);
    setNotice(null);

    try {
      const res = await undoImportBatch(batchId);
      if (res.ok) {
        setBatches((prev) =>
          prev.map((b) => (b.id === batchId ? { ...b, status: "undone" } : b))
        );
        setFlashedId(batchId);
        window.setTimeout(() => setFlashedId((cur) => (cur === batchId ? null : cur)), 1100);
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
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-divider text-[10px] font-semibold text-ink-muted uppercase tracking-[0.06em] whitespace-nowrap">
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
              <tr
                key={b.id}
                className={cn(
                  "h-12 border-t border-divider transition-colors hover:bg-accent-soft/40",
                  flashedId === b.id && "flash-accent",
                )}
              >
                <td className="px-4 py-2.5 font-medium text-ink whitespace-nowrap">
                  {formatDate(b.createdAt.slice(0, 10))}
                </td>
                <td className="px-4 py-2.5 text-ink text-xs truncate max-w-[200px]" title={b.fileName || undefined}>
                  {b.fileName || "—"}
                </td>
                <td className="px-4 py-2.5 text-right font-semibold text-ink tabular-nums whitespace-nowrap">
                  {b.totalRows.toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-2.5 text-right text-positive font-medium tabular-nums whitespace-nowrap">
                  {b.insertedRows.toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-2.5 text-right text-ink font-medium tabular-nums whitespace-nowrap">
                  {b.updatedRows.toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-2.5 text-right text-ink-muted tabular-nums whitespace-nowrap">
                  {b.skippedRows.toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
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
                <td className="px-4 py-2.5 text-ink-muted whitespace-nowrap">
                  {b.createdBy?.full_name || "—"}
                </td>
                {canManage && (
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {b.status === "done" && (
                      <ConfirmButton
                        title="Rollback import batch?"
                        description="All policies and orphan clients created in this batch will be permanently removed."
                        confirmLabel="Rollback"
                        icon={<RollbackGuardCharacter active />}
                        loading={undoingId === b.id}
                        disabled={undoingId !== null}
                        onConfirm={() => handleUndo(b.id)}
                        className={buttonStyles("ghost", "h-7 px-2 text-xs text-negative hover:bg-negative-soft hover:text-negative")}
                      >
                        {undoingId !== b.id && <RotateCcw size={12} />}
                        Undo
                      </ConfirmButton>
                    )}
                  </td>
                )}
              </tr>
            ))}

            {batches.length === 0 && (
              <tr>
                <td colSpan={9}>
                  <EmptyState
                    label="No import history found"
                    illustration={<RelaxedEmptyCharacter />}
                    className="py-8"
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
