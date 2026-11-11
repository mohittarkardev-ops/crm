"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { CustomSelect } from "@/components/ui/custom-select";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTROL } from "@/components/ui/field";
import { rejectLargeFile } from "@/components/ui/file-guard";
import { PendingBar } from "@/components/ui/pending-bar";
import { toast } from "@/components/ui/toaster";
import { deleteQuoteDocument, uploadQuoteDocument } from "@/lib/actions/quote-documents";
import { cn } from "@/lib/cn";
import type { QuoteAttachment } from "@/lib/data/quote-documents";
import type { ActionState, Option } from "@/lib/module-types";

const QUOTE_DOC_TYPES: Option[] = [
  { value: "Quote proposal", label: "Quote proposal" },
  { value: "Comparison sheet", label: "Comparison sheet" },
  { value: "Renewal quote", label: "Renewal quote" },
  { value: "Policy copy", label: "Policy copy" },
  { value: "Other", label: "Other" },
];

export function QuoteDocumentsCard({
  quoteId,
  documents,
  canEdit,
  index = 2,
}: {
  quoteId: string;
  documents: QuoteAttachment[];
  canEdit: boolean;
  index?: number;
}) {
  const [state, formAction, pending] = useActionState(uploadQuoteDocument, { ok: false } as ActionState);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepthRef = useRef(0);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const handled = useRef<ActionState | null>(null);

  useEffect(() => {
    if (state.ok && handled.current !== state) {
      handled.current = state;
      toast(state.message ?? "Quote document uploaded.");
      formRef.current?.reset();
    }
  }, [state]);

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (!dropped || !fileRef.current) return;
    const dt = new DataTransfer();
    dt.items.add(dropped);
    fileRef.current.files = dt.files;
    fileRef.current.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function handleDelete(docId: string) {
    setDeletingId(docId);
    const res = await deleteQuoteDocument(docId, quoteId);
    setDeletingId(null);
    if (res.ok) toast(res.message ?? "Quote document removed.");
    else if (res.error) toast(res.error, "error");
  }

  return (
    <Card index={index}>
      <CardHeader
        title="Quote documents for customer"
        action={<span className="text-xs font-medium text-ink-faint">{documents.length} shared</span>}
      />
      <p className="mb-4 text-xs text-ink-muted">
        Upload quote proposals, premium comparisons, or renewal sheets. Customers see and download these files in the
        mobile app on their Quote Tracking screen.
      </p>

      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          label="No quote documents uploaded yet"
          hint={canEdit ? "Upload a PDF or image below so the customer can review your quote." : undefined}
        />
      ) : (
        <ul className="divide-y divide-divider rounded-tile border border-divider bg-surface-card">
          {documents.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{d.name}</p>
                <p className="text-xs text-ink-muted">
                  {d.type} · Shared by {d.uploadedBy}
                  {d.uploadedOn ? ` · ${d.uploadedOn}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {d.href ? (
                  <a
                    href={d.href}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonStyles("secondary", "h-8 px-3 text-xs")}
                  >
                    Open
                  </a>
                ) : (
                  <span className="text-xs text-ink-faint">Unavailable</span>
                )}
                {canEdit && (
                  <ConfirmButton
                    confirmLabel="Remove"
                    title="Remove this quote document?"
                    tone="danger"
                    loading={deletingId === d.id}
                    disabled={deletingId === d.id}
                    className={buttonStyles("icon", "text-ink-faint hover:text-negative")}
                    onConfirm={() => void handleDelete(d.id)}
                    ariaLabel={`Remove ${d.name}`}
                  >
                    <Trash2 size={14} />
                  </ConfirmButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <form ref={formRef} action={formAction} className="mt-4 space-y-3 border-t border-divider pt-4">
          <input type="hidden" name="quoteId" value={quoteId} />
          <PendingBar active={pending} />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-ink-muted">Attach proposal or document (PDF, JPG, PNG, WebP · max 4 MB)</p>
            <span
              className={cn(
                "text-[11px] font-medium text-ink transition-opacity duration-200",
                isDragging ? "opacity-100" : "opacity-0",
              )}
              aria-hidden={!isDragging}
            >
              Release to attach file
            </span>
          </div>

          <div
            onDragEnter={(e) => {
              if (!e.dataTransfer?.types?.includes("Files")) return;
              e.preventDefault();
              dragDepthRef.current += 1;
              setIsDragging(true);
            }}
            onDragOver={(e) => {
              if (!e.dataTransfer?.types?.includes("Files")) return;
              e.preventDefault();
            }}
            onDragLeave={() => {
              dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
              if (dragDepthRef.current === 0) setIsDragging(false);
            }}
            onDrop={handleDrop}
            className={cn(
              "rounded-tile border border-dashed p-3 transition-colors",
              isDragging ? "border-accent-strong bg-accent-soft/45" : "border-divider/80 bg-surface-muted/20",
            )}
          >
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
              <input
                ref={fileRef}
                name="document"
                onChange={rejectLargeFile}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                className={cn(
                  CONTROL,
                  "h-10 cursor-pointer py-1.5 text-xs file:mr-3 file:cursor-pointer file:rounded-control file:border-0 file:bg-accent-soft file:px-3 file:py-1 file:text-xs file:font-medium file:text-ink",
                )}
              />
              <CustomSelect
                name="documentType"
                defaultValue="Quote proposal"
                options={QUOTE_DOC_TYPES}
                aria-label="Document type"
              />
            </div>
          </div>

          {!state.ok && state.error && (
            <p className="text-xs font-medium text-danger-text" role="alert">
              {state.error}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" loading={pending} className="h-9 px-3.5 text-xs">
              <Upload size={14} />
              {pending ? "Uploading…" : "Share with customer"}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
