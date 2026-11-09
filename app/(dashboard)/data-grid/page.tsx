import type { Metadata } from "next";
import { TableProperties } from "lucide-react";
import { VirtualGrid } from "@/components/modules/data-grid/virtual-grid";
import { getGridCustomFields, getGridPage } from "@/lib/data/data-grid";
import { can } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/server";

export const metadata: Metadata = {
  title: "Data Grid — SecureDrive CRM",
  description: "High-performance policy matrix with keyset pagination and inline editing.",
};

/**
 * Data Grid (S7).
 * Power view of policies with virtualized scrolling, server-side trigram search, column filters,
 * inline editing, and CSV/Excel export.
 * Access is controlled via RBAC: only users with datagrid.view can open this page.
 */
export default async function DataGridPage() {
  const staff = await requirePermission("datagrid.view");
  const canEdit = can(staff, "datagrid.edit");
  const canExport = can(staff, "datagrid.export");

  const [initialData, customFields] = await Promise.all([
    getGridPage({ cursor: null }),
    getGridCustomFields(),
  ]);

  return (
    <div className="space-y-4">
      <VirtualGrid
        initialRows={initialData.rows}
        initialCursor={initialData.nextCursor}
        initialTotal={initialData.totalCount}
        customFields={customFields}
        canEdit={canEdit}
        canExport={canExport}
      />
    </div>
  );
}
