"use client";

import React, { useState } from "react";
import { Plus, Edit2, Trash2, ShieldCheck, Users, KeyRound } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button, buttonStyles } from "@/components/ui/button";
import { ModuleEmptyCharacter, RollbackGuardCharacter } from "@/components/ui/characters";
import { Chip } from "@/components/ui/chip";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toaster";
import { type RoleItem } from "@/lib/data/rbac";
import { RoleEditorDrawer } from "./role-editor-drawer";
import { deleteRoleAction } from "@/lib/actions/rbac";

interface RolesTableProps {
  roles: RoleItem[];
}

export function RolesTable({ roles }: RolesTableProps) {
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setEditingRole(null);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (role: RoleItem) => {
    setEditingRole(role);
    setIsEditorOpen(true);
  };

  const handleDelete = async (role: RoleItem) => {
    if (role.isSystem) {
      toast(`System role "${role.name}" cannot be deleted.`, "error");
      return;
    }

    setDeletingId(role.id);
    try {
      const res = await deleteRoleAction(role.id);
      if (!res.ok) {
        toast(res.error || "Failed to delete role.", "error");
      } else {
        toast(`Role "${role.name}" deleted.`);
      }
    } catch (err: any) {
      toast(err.message || "An error occurred.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Role Definitions & Permissions"
        action={
          <Button onClick={handleOpenAdd}>
            <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
            Add Role
          </Button>
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-divider text-[10px] font-semibold text-ink-muted uppercase tracking-[0.06em] whitespace-nowrap">
              <th className="px-4 pb-2.5">Role Name</th>
              <th className="px-4 pb-2.5">Description</th>
              <th className="px-4 pb-2.5 text-center">Type</th>
              <th className="px-4 pb-2.5 text-center">Staff Count</th>
              <th className="px-4 pb-2.5 text-center">Permissions</th>
              <th className="px-4 pb-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider/60">
            {roles.map((r) => {
              const isAdmin = r.name === "Admin";
              return (
                <tr key={r.id} className="h-14 border-t border-divider transition-colors hover:bg-accent-soft/40">
                  <td className="px-4 py-3 font-semibold text-ink whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {r.isSystem ? (
                        <ShieldCheck size={15} className="text-ink shrink-0" />
                      ) : (
                        <KeyRound size={15} className="text-ink-muted shrink-0" />
                      )}
                      <span>{r.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-muted max-w-xs truncate" title={r.description || undefined}>
                    {r.description || <span className="text-ink-faint italic">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <Chip tone={r.isSystem ? "accent" : "neutral"}>
                      {r.isSystem ? "System" : "Custom"}
                    </Chip>
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-ink tabular-nums whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <Users size={12} className="text-ink-muted" />
                      {r.staffCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {isAdmin ? (
                      <Chip tone="positive">All Access</Chip>
                    ) : (
                      <span className="font-semibold text-ink tabular-nums">
                        {r.permissions.length} modules/actions
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        onClick={() => handleOpenEdit(r)}
                        className="h-7 px-2 text-xs"
                      >
                        <Edit2 size={12} />
                        {isAdmin ? "View" : "Edit"}
                      </Button>
                      {!r.isSystem && r.staffCount === 0 && (
                        <ConfirmButton
                          title={`Delete role "${r.name}"?`}
                          description="No staff are assigned to this role. Deleting it removes the role permanently."
                          confirmLabel="Delete role"
                          icon={<RollbackGuardCharacter active />}
                          loading={deletingId === r.id}
                          disabled={deletingId !== null}
                          onConfirm={() => handleDelete(r)}
                          className={buttonStyles("ghost", "h-7 px-2 text-xs text-negative hover:bg-negative-soft hover:text-negative")}
                        >
                          {deletingId !== r.id && <Trash2 size={12} />}
                          Delete
                        </ConfirmButton>
                      )}
                      {!r.isSystem && r.staffCount > 0 && (
                        <span
                          title={`Reassign ${r.staffCount} assigned staff before deleting`}
                          className="px-2 text-[11px] text-ink-faint select-none"
                        >
                          In use
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {roles.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    label="No roles found. Please run migration 0010 in Supabase."
                    illustration={<ModuleEmptyCharacter variant="roles" />}
                    className="py-8"
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <RoleEditorDrawer
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        role={editingRole}
      />
    </Card>
  );
}
