import type { Metadata } from "next";
import { ImportPageShell } from "@/components/modules/import/import-page-shell";
import { getImportBatches, getImportCustomFields } from "@/lib/data/import";
import { can } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/server";

export const metadata: Metadata = {
  title: "Data Transfer — SecureDrive CRM",
  description: "Bulk data import with smart column mapping, undo capabilities, and mass vehicle lookup.",
};

/**
 * Data Transfer (S8).
 * Bulk import (CSV / Excel / JSON) with in-browser chunking and smart synonym column mapping.
 * Bulk lookup exporter for mass vehicle queries.
 * Import history with rollback / undo functionality.
 * Access is controlled via RBAC (adminOnly: true).
 */
export default async function ImportPage() {
  const staff = await requirePermission("import.view");
  const canImport = can(staff, "import.import");
  const canLookup = can(staff, "import.lookup");

  const [batches, customFields] = await Promise.all([
    getImportBatches(),
    getImportCustomFields(),
  ]);

  return (
    <div className="space-y-4">
      <ImportPageShell
        customFields={customFields}
        batches={batches}
        canImport={canImport}
        canLookup={canLookup}
      />
    </div>
  );
}
