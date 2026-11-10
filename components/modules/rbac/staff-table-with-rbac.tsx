"use client";

import React, { useState } from "react";
import { ModulePage } from "@/components/modules/module-page";
import { StaffPermissionsDrawer } from "./staff-permissions-drawer";
import { type RoleItem, type StaffOverride } from "@/lib/data/rbac";
import { getStaffCustomPermissionsAction } from "@/lib/actions/rbac";
import { addStaff, updateStaff, activateAgent, deactivateAgent, removeStaff } from "@/lib/actions/staff";
import type { FieldDef } from "@/lib/module-types";
import { KeyRound, Shield } from "lucide-react";

interface StaffTableWithRbacProps {
  rows: any[];
  roles: RoleItem[];
  isSuperAdmin: boolean;
}

const LOGIN_ONLY = { field: "access", equals: [""] };
const EDIT_LOGIN_ONLY = { field: "hasLogin", equals: ["yes"] };
const EDIT_NO_LOGIN_ONLY = { field: "hasLogin", equals: ["no"] };
const ENABLE_LOGIN_NOW = { field: "access", equals: ["login"] };
const EDIT_ROLE_ONLY = { field: "editableRole", equals: ["yes"] };

const PROFILE_FIELDS: FieldDef[] = [
  { name: "employeeCode", label: "Employee code", hint: "Optional, for example EMP-001." },
  { name: "mobile", label: "Mobile number", type: "tel" },
  { name: "designation", label: "Designation", full: true },
];

export function StaffTableWithRbac({ rows, roles, isSuperAdmin }: StaffTableWithRbacProps) {
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [staffOverrides, setStaffOverrides] = useState<StaffOverride[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loadingOverrides, setLoadingOverrides] = useState(false);

  const roleOptions = isSuperAdmin
    ? [
        { value: "admin", label: "Admin" },
        { value: "staff", label: "Staff" },
      ]
    : [{ value: "staff", label: "Staff" }];

  const handleOpenPermissions = async (row: any) => {
    setSelectedStaff({
      id: row.id,
      name: row.name,
      email: row.email,
      roleId: row.roleId,
      role: row.rawRole || row.role,
    });
    setStaffOverrides([]);
    setLoadingOverrides(true);
    setIsDrawerOpen(true);

    try {
      const overrides = await getStaffCustomPermissionsAction(row.id);
      setStaffOverrides(overrides);
    } catch {
      setStaffOverrides([]);
    } finally {
      setLoadingOverrides(false);
    }
  };

  return (
    <>
      <ModulePage
        index={1}
        title="Staff Accounts"
        rows={rows}
        emptyLabel="No staff accounts yet"
        search="Search name, code, mobile or email…"
        columns={[
          { key: "name", label: "Name", type: "person" },
          { key: "employeeCode", label: "Code" },
          { key: "designation", label: "Designation" },
          { key: "mobile", label: "Mobile" },
          { key: "email", label: "Email" },
          { key: "roleLabel", label: "Role / Category", type: "chip" },
          { key: "signIn", label: "Sign-in" },
          { key: "joined", label: "Joined", type: "date" },
        ]}
        rowActions={[
          {
            label: "Permissions",
            showWhen: { key: "canPermRow", in: ["yes"] },
            action: async (id: string) => {
              const row = rows.find((r) => r.id === id);
              if (row) void handleOpenPermissions(row);
              return { ok: true };
            },
          },
          { label: "Switch off", action: deactivateAgent, showWhen: { key: "agentState", in: ["active"] } },
          { label: "Switch on", action: activateAgent, showWhen: { key: "agentState", in: ["inactive"] } },
          {
            label: "Remove",
            action: removeStaff,
            danger: true,
            showWhen: { key: "canRemoveRow", in: ["yes"] },
            confirm: "Remove this person? If they sign in, their login stops working immediately.",
          },
        ]}
        primary={{
          label: "Add Staff",
          drawerTitle: "Add Account",
          action: addStaff,
          fields: [
            { name: "name", label: "Full name", required: true },
            {
              name: "access",
              label: "Access",
              type: "select",
              options: [
                { value: "", label: "Can sign in to the CRM" },
                { value: "none", label: "No login (agent only)" },
              ],
              full: true,
              hint: "Agents without a login only appear in lists, for example when claims are added.",
            },
            { name: "email", label: "Email (login ID)", type: "email", required: true, showWhen: LOGIN_ONLY },
            {
              name: "role",
              label: "Role",
              type: "select",
              options: roleOptions,
              required: true,
              showWhen: LOGIN_ONLY,
              hint: "Fine-grained permissions can be customized via the Permissions button.",
            },
            {
              name: "password",
              label: "Temporary password",
              type: "password",
              required: true,
              full: true,
              showWhen: LOGIN_ONLY,
              hint: "At least 8 characters. Share it with them; they can sign in immediately.",
            },
            ...PROFILE_FIELDS,
          ],
        }}
        edit={{
          drawerTitle: "Edit Staff Account",
          showWhen: { key: "canEditRow", in: ["yes"] },
          action: updateStaff,
          fields: [
            { name: "name", label: "Full name", required: true },
            {
              name: "role",
              label: "Role",
              type: "select",
              options: roleOptions,
              showWhen: EDIT_ROLE_ONLY,
              hint: "Admin vs Staff level. Custom roles & fine-grained permissions are in Permissions.",
            },
            ...PROFILE_FIELDS,
            {
              name: "access",
              label: "CRM sign-in access",
              type: "select",
              full: true,
              showWhen: EDIT_NO_LOGIN_ONLY,
              options: [
                { value: "", label: "No login (agent only)" },
                { value: "login", label: "Enable CRM sign-in" },
              ],
              hint: "Upgrade this agent to a CRM login in place without losing existing claim history.",
            },
            { name: "email", label: "Email (login ID)", type: "email", required: true, showWhen: ENABLE_LOGIN_NOW },
            {
              name: "grantRole",
              label: "Role",
              type: "select",
              options: roleOptions,
              required: true,
              showWhen: ENABLE_LOGIN_NOW,
              hint: "Fine-grained permissions can be customized via Permissions after saving.",
            },
            {
              name: "password",
              label: "Temporary password",
              type: "password",
              required: true,
              full: true,
              showWhen: ENABLE_LOGIN_NOW,
              hint: "At least 8 characters. Share it with them; they can sign in immediately.",
            },
            {
              name: "newPassword",
              label: "New password (optional)",
              type: "password",
              full: true,
              showWhen: EDIT_LOGIN_ONLY,
              hint: "Leave empty to keep the current password.",
            },
          ],
        }}
      />

      <StaffPermissionsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        staff={selectedStaff}
        roles={roles}
        initialOverrides={staffOverrides}
        loading={loadingOverrides}
        isActorAdmin={isSuperAdmin}
      />
    </>
  );
}
