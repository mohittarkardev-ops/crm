"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Download,
  Eye,
  FileImage,
  FileText,
  Maximize2,
  Printer,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
  AlertCircle,
} from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";

export type DocumentViewerModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  url: string | null;
  docType?: string | null;
  downloadUrl?: string | null;
};

function isImageFile(filenameOrUrl: string): boolean {
  return /\.(jpe?g|png|webp|svg|gif|bmp)(\?|$)/i.test(filenameOrUrl);
}

/**
 * Dedicated In-CRM Document Viewer Modal:
 * Opens policy copies, endorsements, RC cards, and claims attachments directly
 * inside the CRM without opening external browser tabs or windows.
 */
export function DocumentViewerModal({
  open,
  onClose,
  title,
  url,
  docType = "Policy Document",
  downloadUrl,
}: DocumentViewerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset viewer state when URL changes or modal opens
  useEffect(() => {
    if (open) {
      setLoading(true);
      setError(false);
      setZoom(1);
      setRotation(0);
    }
  }, [open, url]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!mounted || !open || !url) return null;

  const isImg = isImageFile(title) || isImageFile(url);
  const resolvedDownloadUrl = downloadUrl ?? (url.includes("?") ? `${url}&download=1` : `${url}?download=1`);

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.print();
        return;
      } catch {
        /* Fallback */
      }
    }
    window.print();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Document Viewer: ${title}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex flex-col w-full max-w-5xl h-[90vh] rounded-card bg-surface-strong border border-divider shadow-elev-3 overflow-hidden animate-scale-in">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-3 border-b border-divider bg-surface px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="grid size-9 shrink-0 place-items-center rounded-tile bg-accent-soft text-ink">
              {isImg ? (
                <FileImage size={18} strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <FileText size={18} strokeWidth={1.75} aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-ink truncate" title={title}>
                {title}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <Chip tone="accent" className="text-[10px]">
                  {docType || "Document"}
                </Chip>
                <span className="text-[11px] text-ink-muted hidden sm:inline">
                  SecureDrive In-CRM Viewer
                </span>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isImg && (
              <>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  title="Zoom Out"
                  aria-label="Zoom out"
                  className={buttonStyles("icon", "size-8 text-ink-muted hover:text-ink")}
                >
                  <ZoomOut size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  title="Zoom In"
                  aria-label="Zoom in"
                  className={buttonStyles("icon", "size-8 text-ink-muted hover:text-ink")}
                >
                  <ZoomIn size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  title="Rotate 90°"
                  aria-label="Rotate document 90 degrees"
                  className={buttonStyles("icon", "size-8 text-ink-muted hover:text-ink")}
                >
                  <RotateCw size={15} />
                </button>
              </>
            )}

            {!isImg && (
              <button
                type="button"
                onClick={handlePrint}
                title="Print Document"
                aria-label="Print document"
                className={buttonStyles("icon", "size-8 text-ink-muted hover:text-ink hidden sm:inline-flex")}
              >
                <Printer size={15} />
              </button>
            )}

            <a
              href={resolvedDownloadUrl}
              download
              title="Download Document"
              aria-label="Download copy"
              className={buttonStyles("secondary", "h-8 px-2.5 sm:px-3 text-xs gap-1.5")}
            >
              <Download size={14} />
              <span className="hidden sm:inline">Download</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              title="Close Viewer (Esc)"
              aria-label="Close document viewer"
              className={buttonStyles("icon", "size-8 text-ink-muted hover:text-ink")}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="relative flex-1 w-full bg-surface-muted/30 overflow-auto flex items-center justify-center">
          {/* Loading Indicator */}
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-surface/70 backdrop-blur-xs">
              <Spinner size={28} className="text-accent" />
              <p className="text-xs font-semibold text-ink">
                Loading document securely…
              </p>
            </div>
          )}

          {/* Error State */}
          {error ? (
            <div className="flex flex-col items-center justify-center gap-3 p-6 text-center max-w-md">
              <div className="grid size-12 place-items-center rounded-full bg-negative-soft text-negative">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-sm font-bold text-ink">Unable to preview document</h3>
              <p className="text-xs text-ink-muted">
                The document format cannot be rendered directly in the embedded preview or the session has expired. You can download the document directly to view it on your device.
              </p>
              <a
                href={resolvedDownloadUrl}
                download
                className={buttonStyles("primary", "h-9 px-4 text-xs mt-2")}
              >
                <Download size={14} className="mr-1.5" />
                Download Document
              </a>
            </div>
          ) : isImg ? (
            /* Image Viewer with Zoom & Pan */
            <div className="flex items-center justify-center w-full h-full p-4 overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={title}
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setError(true);
                }}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: "transform 0.15s ease-out",
                }}
                className="max-w-full max-h-full object-contain rounded-tile shadow-elev-1 select-none"
              />
            </div>
          ) : (
            /* PDF / Native Document Embedded Viewer */
            <iframe
              ref={iframeRef}
              src={url}
              title={title}
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError(true);
              }}
              className="w-full h-full border-0 bg-white"
            />
          )}
        </div>

        {/* Footer Bar */}
        <div className="flex items-center justify-between border-t border-divider bg-surface px-4 py-2.5 text-xs text-ink-muted">
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-positive" />
            <span className="font-mono text-[11px] text-ink-faint">
              Encrypted 60s signed vault link
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={buttonStyles("secondary", "h-7 px-3 text-xs")}
            >
              Close
            </button>
            <a
              href={resolvedDownloadUrl}
              download
              className={buttonStyles("primary", "h-7 px-3 text-xs gap-1.5")}
            >
              <Download size={13} />
              <span>Save Copy</span>
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
