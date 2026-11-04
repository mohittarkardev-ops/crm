"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";
import { CONTROL } from "@/components/ui/field";
import { rejectLargeFile } from "@/components/ui/file-guard";
import { toast } from "@/components/ui/toaster";
import { deleteDocument, uploadDocument } from "@/lib/actions/policies";
import { cn } from "@/lib/cn";
import type { ActionState } from "@/lib/module-types";
import { DOCUMENT_TYPE_OPTIONS } from "@/lib/options";

/** Adds a document (PDF, JPG, PNG or WebP, up to 10 MB) to a policy. */
export function DocumentUpload({ policyId }: { policyId: string }) {
  const [state, formAction, pending] = useActionState(uploadDocument, { ok: false } as ActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const handled = useRef<ActionState | null>(null);

  useEffect(() => {
    if (!state.ok || handled.current === state) return;
    handled.current = state;
    toast(state.message ?? "Document uploaded.");
    formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="mt-4 space-y-3 border-t border-divider pt-4">
      <input type="hidden" name="policyId" value={policyId} />
      <p className="text-xs font-medium text-ink-muted">Upload a document (up to 4 MB)</p>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
        <input
          name="document"
          onChange={rejectLargeFile}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          className={cn(
            CONTROL,
            "h-10 cursor-pointer py-1.5 file:mr-3 file:rounded-[4px] file:border-0 file:bg-ink file:px-3 file:py-1 file:text-xs file:font-medium file:text-white",
          )}
        />
        <select name="documentType" defaultValue="Policy copy" className={cn(CONTROL, "h-10")}>
          {DOCUMENT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {state.error && (
        <p role="alert" className="rounded-control bg-negative-soft px-3 py-2 text-xs text-negative">
          {state.error}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Uploading…" : "Upload"}
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
    if (busy || !window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
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
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      aria-label={`Delete ${name}`}
      className={buttonStyles("icon", "size-8 text-ink-faint hover:bg-negative-soft hover:text-negative")}
    >
      <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}
