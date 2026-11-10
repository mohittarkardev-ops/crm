"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { CustomSelect } from "@/components/ui/custom-select";
import { PendingBar } from "@/components/ui/pending-bar";
import { Spinner } from "@/components/ui/spinner";
import { CONTROL } from "@/components/ui/field";
import { rejectLargeFile } from "@/components/ui/file-guard";
import { toast } from "@/components/ui/toaster";
import { deleteDocument, uploadDocument } from "@/lib/actions/policies";
import { cn } from "@/lib/cn";
import type { ActionState } from "@/lib/module-types";
import { DOCUMENT_TYPE_OPTIONS } from "@/lib/options";

/** Adds a document (PDF, JPG, PNG or WebP, up to 4 MB) to a policy, with drag-over highlight. */
export function DocumentUpload({ policyId }: { policyId: string }) {
  const [state, formAction, pending] = useActionState(uploadDocument, { ok: false } as ActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const handled = useRef<ActionState | null>(null);
  const dragDepthRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [errorPulse, setErrorPulse] = useState(0);
  const [uploadedFlash, setUploadedFlash] = useState(false);

  useEffect(() => {
    if (state.ok && handled.current !== state) {
      handled.current = state;
      toast(state.message ?? "Document uploaded.");
      formRef.current?.reset();
      setUploadedFlash(true);
      const t = window.setTimeout(() => setUploadedFlash(false), 1600);
      return () => window.clearTimeout(t);
    }
    if (!state.ok && state.error) {
      setErrorPulse((n) => n + 1);
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

  return (
    <form ref={formRef} action={formAction} className="mt-4 space-y-3 border-t border-divider pt-4">
      <input type="hidden" name="policyId" value={policyId} />
      <PendingBar active={pending} />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-ink-muted">Upload a document (up to 4 MB)</p>
        <span
          className={cn(
            "text-[11px] font-medium text-ink transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
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
          "rounded-tile border border-dashed p-3 transition-[border-color,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          isDragging ? "border-accent-strong bg-accent-soft/45" : "border-divider/80 bg-surface-muted/20",
        )}
      >
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
          <input
            ref={fileRef}
            name="document"
            onChange={rejectLargeFile}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            className={cn(
              CONTROL,
              "h-10 cursor-pointer py-1.5 file:mr-3 file:rounded-[4px] file:border-0 file:bg-ink file:px-3 file:py-1 file:text-xs file:font-medium file:text-white",
            )}
          />
          <CustomSelect
            name="documentType"
            defaultValue="Policy copy"
            options={DOCUMENT_TYPE_OPTIONS}
            className="h-10 text-xs"
          />
        </div>
      </div>
      {state.error && (
        <p key={errorPulse} role="alert" className="micro-shake rounded-control bg-negative-soft px-3 py-2 text-xs text-negative">
          {state.error}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" loading={pending} saved={uploadedFlash} savedLabel="Uploaded">
          Upload
        </Button>
      </div>
    </form>
  );
}

export function DeleteDocumentButton({
  policyId,
  documentId,
  name,
}: {
  policyId: string;
  documentId: string;
  name: string;
}) {
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await deleteDocument(documentId, policyId);
      if (result.ok) toast(result.message ?? "Document deleted.");
      else toast(result.error ?? "Could not delete this document.", "error");
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConfirmButton
      title="Delete document?"
      description={`Remove "${name}" permanently? This cannot be undone.`}
      confirmLabel="Delete"
      loading={busy}
      ariaLabel={`Delete ${name}`}
      onConfirm={remove}
      className={buttonStyles("icon", "size-8 text-ink-faint hover:bg-negative-soft hover:text-negative")}
    >
      {!busy && <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />}
    </ConfirmButton>
  );
}
