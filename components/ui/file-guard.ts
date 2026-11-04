"use client";

import type { ChangeEvent } from "react";
import { toast } from "@/components/ui/toaster";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/upload-limits";

/** onChange handler for file inputs: clears the choice and explains when the file is too large. */
export function rejectLargeFile(event: ChangeEvent<HTMLInputElement>) {
  const file = event.currentTarget.files?.[0];
  if (file && file.size > MAX_UPLOAD_BYTES) {
    event.currentTarget.value = "";
    toast(
      `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. Choose a file of ${MAX_UPLOAD_LABEL} or less.`,
      "error",
    );
  }
}
