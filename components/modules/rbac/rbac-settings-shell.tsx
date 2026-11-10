"use client";

import React, { useState } from "react";
import { Users, ShieldCheck } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import { StaffTableWithRbac } from "./staff-table-with-rbac";
import { RolesTable } from "./roles-table";
import type { RoleItem } from "@/lib/data/rbac";

interface RbacSettingsShellProps {
  staffRows: any[];
  roles: RoleItem[];
  isSuperAdmin: boolean;
}

export function RbacSettingsShell({ staffRows, roles, isSuperAdmin }: RbacSettingsShellProps) {
  const [activeTab, setActiveTab] = useState<"staff" | "roles">("staff");
  const currentTab = isSuperAdmin ? activeTab : "staff";

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {isSuperAdmin ? (
          <Segmented
            label="Access Management Navigation"
            value={currentTab}
            onChange={(val) => setActiveTab(val as "staff" | "roles")}
            options={[
              { value: "staff", label: `Staff Accounts (${staffRows.length})` },
              { value: "roles", label: `Roles & Permissions (${roles.length})` },
            ]}
          />
        ) : (
          <div className="text-sm font-semibold text-ink">
            Staff Accounts ({staffRows.length})
          </div>
        )}
        <p className="text-xs text-ink-muted">
          {currentTab === "staff"
            ? "Manage staff logins, agent profiles, and individual permission overrides."
            : "Define reusable roles and fine-tune system-wide module access permissions."}
        </p>
      </div>

      {currentTab === "staff" ? (
        <StaffTableWithRbac rows={staffRows} roles={roles} isSuperAdmin={isSuperAdmin} />
      ) : (
        <RolesTable roles={roles} />
      )}
    </div>
  );
}
