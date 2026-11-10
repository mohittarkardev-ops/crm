"use client";

import React, { useState, useEffect, useId } from "react";
import { Drawer, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { CONTROL } from "@/components/ui/field";
import { MODULES, type PermissionKey } from "@/lib/rbac/permissions";
import { createRoleAction, updateRoleAction } from "@/lib/actions/rbac";
import type { RoleItem } from "@/lib/data/rbac";
import { cn } from "@/lib/cn";
import { Check, ShieldCheck, AlertCircle } from "lucide-react";

interface RoleEditorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  role: RoleItem | null; // null = create new role
}

export function RoleEditorDrawer({ isOpen, onClose, role }: RoleEditorDrawerProps) {
  const formId = useId();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(role);
  const isSystem = role?.isSystem || false;
  const isAdminRole = role?.name === "Admin";

  const isDirty = (() => {
    if (!isOpen || isAdminRole) return false;
    const initName = role?.name ?? "";
    const initDesc = role?.description ?? "";
    const initPerms = new Set(role?.permissions ?? []);
    if (name !== initName || description !== initDesc) return true;
    if (selectedPerms.size !== initPerms.size) return true;
    for (const p of selectedPerms) if (!initPerms.has(p)) return true;
    return false;
  })();

  useEffect(() => {
    if (isOpen) {
      if (role) {
        setName(role.name);
        setDescription(role.description || "");
        setSelectedPerms(new Set(role.permissions));
      } else {
        setName("");
        setDescription("");
        setSelectedPerms(new Set());
      }
      setError(null);
    }
  }, [isOpen, role]);

  const togglePermission = (key: string) => {
    if (isAdminRole) return;
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleModuleAll = (moduleKey: string) => {
    if (isAdminRole) return;
    const mod = MODULES.find((m) => m.key === moduleKey);
    if (!mod) return;
    const modPermKeys = mod.permissions.map((p) => p.key);
    const allSelected = modPermKeys.every((k) => selectedPerms.has(k));

    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        modPermKeys.forEach((k) => next.delete(k));
      } else {
        modPermKeys.forEach((k) => next.add(k));
      }
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdminRole) {
      onClose();
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const permsArray = Array.from(selectedPerms);
      let res;
      if (isEdit && role) {
        res = await updateRoleAction(role.id, name, description, permsArray);
      } else {
        res = await createRoleAction(name, description, permsArray);
      }

      if (res.ok) {
        onClose();
      } else {
        setError(res.error || "Failed to save role.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      open={isOpen}
      onClose={onClose}
      dirty={isDirty}
      title={isAdminRole ? "View Role: Admin" : isEdit ? `Edit Role: ${role?.name}` : "Create New Role"}
    >
      <form id={formId} onSubmit={handleSave} className="space-y-5">
        {isAdminRole && (
          <div className="flex items-center gap-2 rounded-tile bg-accent-soft p-3 text-xs text-ink font-medium">
            <ShieldCheck size={16} className="text-ink shrink-0" />
            <span>The Admin role inherently retains full system access to all current and future modules.</span>
          </div>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-muted">
            Role Name <span className="text-negative">*</span>
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSystem}
            placeholder="e.g. Claims Specialist, Operations"
            className={cn(CONTROL, "h-10", isSystem && "opacity-70 bg-surface-muted")}
            required
          />
          <span className="text-xs text-ink-muted">
            {isSystem ? "System role names cannot be renamed." : "e.g. Claims Specialist, Operations"}
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-muted">Description</span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isAdminRole}
            placeholder="Explain what this role is responsible for."
            className={cn(CONTROL, "h-10", isAdminRole && "opacity-70 bg-surface-muted")}
          />
        </label>

        {/* Permissions by Module */}
        <div className="space-y-4 pt-2 border-t border-divider">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Module Permissions ({selectedPerms.size} selected)
            </h3>
          </div>

          <div className="space-y-4">
            {MODULES.map((mod) => {
              const modPermKeys = mod.permissions.map((p) => p.key);
              const allChecked = modPermKeys.every((k) => selectedPerms.has(k) || isAdminRole);
              const someChecked = modPermKeys.some((k) => selectedPerms.has(k) || isAdminRole);

              return (
                <div key={mod.key} className="rounded-tile border border-divider p-3 bg-surface-strong">
                  <div className="flex items-center justify-between pb-2 border-b border-divider/60">
                    <span className="text-xs font-bold text-ink">{mod.label}</span>
                    {!isAdminRole && (
                      <button
                        type="button"
                        onClick={() => toggleModuleAll(mod.key)}
                        className="text-[11px] font-medium text-ink-muted hover:text-ink select-none"
                      >
                        {allChecked ? "Deselect all" : "Select all"}
                      </button>
                    )}
                  </div>

                  <div className="grid gap-2 pt-2.5 sm:grid-cols-2">
                    {mod.permissions.map((p) => {
                      const isChecked = selectedPerms.has(p.key) || isAdminRole;
                      return (
                        <label
                          key={p.key}
                          className="flex items-start gap-2 cursor-pointer text-xs text-ink-muted hover:text-ink select-none"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(p.key)}
                            disabled={isAdminRole}
                            className="rounded border-divider text-ink focus:ring-0 mt-0.5 accent-[var(--text)]"
                          />
                          <div>
                            <span className="font-medium block text-ink">{p.label}</span>
                            <span className="text-[10px] text-ink-faint">{p.key}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-tile bg-negative-soft p-3 text-xs text-negative">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <DrawerFooter>
          {isAdminRole ? (
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" form={formId} loading={loading}>
                Save Role
              </Button>
            </>
          )}
        </DrawerFooter>
      </form>
    </Drawer>
  );
}
