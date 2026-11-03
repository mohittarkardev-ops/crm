import { Download, ExternalLink, File as FileIcon, FileImage, FileText } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import type { DocumentItem } from "@/lib/data/details";
import { formatDate } from "@/lib/format";
import { DeleteDocumentButton, DocumentUpload } from "@/components/modules/document-actions";

function fileName(path: string) {
  return path.split("/").filter(Boolean).pop() ?? path;
}

function iconFor(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return FileText;
  if (ext && ["jpg", "jpeg", "png", "webp"].includes(ext)) return FileImage;
  return FileIcon;
}

/**
 * Documents attached to a policy. Files live in the private DOCUMENTS bucket and open through
 * /policies/[id]/documents/[docId], which creates a fresh 60-second signed link on every click.
 */
export function DocumentsCard({
  policyId,
  documents,
  index,
}: {
  policyId: string;
  documents: DocumentItem[];
  index?: number;
}) {
  return (
    <Card index={index}>
      <CardHeader title="Documents" action={<Chip>{documents.length}</Chip>} />

      {documents.length === 0 ? (
        <EmptyState label="No documents uploaded" icon={FileText} className="py-8" />
      ) : (
        <ul className="divide-y divide-divider">
          {documents.map((doc) => {
            const name = fileName(doc.filePath);
            const Icon = iconFor(name);
            const href = `/policies/${policyId}/documents/${doc.id}`;
            return (
              <li key={doc.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="grid size-10 shrink-0 place-items-center rounded-tile bg-surface-muted text-ink-muted">
                  <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="select-text truncate text-sm font-medium text-ink" title={name}>
                    {name}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {doc.type ? `${doc.type} · ` : ""}
                    {doc.uploadedOn ? `Uploaded ${formatDate(doc.uploadedOn)}` : "Upload date unknown"}
                  </p>
                </div>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonStyles("secondary", "h-8 px-3 text-xs")}
                >
                  <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" />
                  Open
                </a>
                <a
                  href={`${href}?download=1`}
                  data-nav-progress="off"
                  aria-label={`Download ${name}`}
                  className={buttonStyles("icon", "size-8")}
                >
                  <Download size={16} strokeWidth={1.75} aria-hidden="true" />
                </a>
                <DeleteDocumentButton policyId={policyId} documentId={doc.id} name={name} />
              </li>
            );
          })}
        </ul>
      )}
      <DocumentUpload policyId={policyId} />
    </Card>
  );
}
