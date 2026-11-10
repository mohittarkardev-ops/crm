"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { isAdminOnlyPermission, MODULES } from "@/lib/rbac/permissions";
import { saveStaffPermissionsAction } from "@/lib/actions/rbac";
import type { RoleItem, StaffOverride } from "@/lib/data/rbac";
import { ShieldCheck, AlertCircle, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/cn";

interface StaffPermissionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  staff: {
    id: string;
    name: string;
    email: string;
    roleId?: string | null;
    role?: string | null;
  } | null;
  roles: RoleItem[];
  initialOverrides: StaffOverride[];
  loading?: boolean;
  isActorAdmin?: boolean;
}

export function StaffPermissionsDrawer({
  isOpen,
  onClose,
  staff,
  roles,
  initialOverrides,
  loading: fetching = false,
  isActorAdmin = true,
}: StaffPermissionsDrawerProps) {
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  // Overrides map: { [permissionKey]: boolean (true = granted, false = revoked) }
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialRoleId = useMemo(() => {
    if (!staff) return "";
    return staff.roleId || roles.find((r) => r.name.toLowerCase() === (staff.role || "staff"))?.id || "";
  }, [staff, roles]);

  useEffect(() => {
    if (isOpen && staff) {
      setSelectedRoleId(initialRoleId);
      const map: Record<string, boolean> = {};
      initialOverrides.forEach((o) => {
        map[o.permission] = o.granted;
      });
      setOverrides(map);
      setError(null);
    }
  }, [isOpen, staff, initialRoleId, initialOverrides]);

  const assignableRoles = useMemo(() => {
    if (isActorAdmin) return roles;
    return roles.filter((r) => r.name !== "Admin" && !r.permissions.some((p) => isAdminOnlyPermission(p)));
  }, [roles, isActorAdmin]);

  const isDirty = useMemo(() => {
    if (!isOpen || !staff || fetching) return false;
    if (selectedRoleId !== initialRoleId) return true;
    const initMap: Record<string, boolean> = {};
    for (const o of initialOverrides) initMap[o.permission] = o.granted;
    const keysA = Object.keys(overrides);
    const keysB = Object.keys(initMap);
    if (keysA.length !== keysB.length) return true;
    return keysA.some((k) => overrides[k] !== initMap[k]);
  }, [isOpen, staff, fetching, selectedRoleId, initialRoleId, overrides, initialOverrides]);

  const activeRole = roles.find((r) => r.id === selectedRoleId);
  const isSelectedRoleAdmin = activeRole?.name === "Admin";

  const setOverrideState = (permKey: string, state: "inherit" | "grant" | "revoke") => {
    setOverrides((prev) => {
      const next = { ...prev };
      if (state === "inherit") {
        delete next[permKey];
      } else if (state === "grant") {
        next[permKey] = true;
      } else if (state === "revoke") {
        next[permKey] = false;
      }
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff || fetching) return;

    setLoading(true);
    setError(null);

    try {
      const overrideList = Object.entries(overrides).map(([permission, granted]) => ({
        permission,
        granted,
      }));

      const res = await saveStaffPermissionsAction(
        staff.id,
        selectedRoleId || null,
        overrideList
      );

      if (res.ok) {
        toast(res.message ?? "Permissions updated.");
        onClose();
      } else {
        setError(res.error || "Failed to update permissions.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      open={isOpen}
      onClose={onClose}
      dirty={isDirty}
      title={`Permissions: ${staff?.name || "Staff"}`}
    >
      <form onSubmit={handleSave} className="space-y-5">
        {/* Info Header */}
        <div className="rounded-tile border border-divider p-3 bg-surface-muted/30 text-xs text-ink-muted">
          <p className="font-semibold text-ink">{staff?.name}</p>
          <p className="text-[11px] text-ink-faint tabular-nums">{staff?.email}</p>
        </div>

        {/* Primary Role Selector */}
        <div>
          <label className="block text-xs font-semibold text-ink mb-1.5">
            Primary Role / Category
          </label>
          <CustomSelect
            value={selectedRoleId}
            onChange={(val) => setSelectedRoleId(val)}
            disabled={fetching}
            options={assignableRoles.map((r) => ({
              value: r.id,
              label: `${r.name}${r.isSystem ? " (System)" : ""}`,
              hint: r.description || undefined,
            }))}
            placeholder="Select a role"
            className="h-10 text-xs font-medium"
          />
          <p className="text-[11px] text-ink-muted mt-1">
            Permissions are inherited from this role, and can be customized below.
          </p>
        </div>

        {fetching ? (
          <div className="flex items-center justify-center gap-2 rounded-tile border border-divider p-6 text-xs text-ink-muted">
            <Spinner size={14} />
            <span>Loading staff overrides…</span>
          </div>
        ) : isSelectedRoleAdmin ? (
          <div className="flex items-center gap-2 rounded-tile bg-accent-soft p-3 text-xs text-ink font-medium">
            <ShieldCheck size={16} className="text-ink shrink-0" />
            <span>Admins inherently have full access to all features. Individual overrides are not required.</span>
          </div>
        ) : (
          /* Individual Overrides Section */
          <div className="space-y-4 pt-2 border-t border-divider">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Individual Overrides
                </h3>
                <p className="text-[11px] text-ink-faint">
                  Grant (+) or Revoke (-) specific permissions for this employee.
                </p>
              </div>
              {Object.keys(overrides).length > 0 && (
                <button
                  type="button"
                  onClick={() => setOverrides({})}
                  className="text-[11px] font-medium text-ink-muted hover:text-ink select-none underline"
                >
                  Reset all to Role default
                </button>
              )}
            </div>

            <div className="space-y-4">
              {MODULES.map((mod) => {
                return (
                  <div key={mod.key} className="rounded-tile border border-divider p-3 bg-surface-strong">
                    <div className="pb-1.5 border-b border-divider/60 text-xs font-bold text-ink">
                      {mod.label}
                    </div>

                    <div className="divide-y divide-divider/40">
                      {mod.permissions.map((p) => {
                        const inRole = activeRole?.permissions.includes(p.key) || false;
                        const hasOverride = overrides[p.key] !== undefined;
                        const overrideVal = overrides[p.key];
                        const lockedAdmin = !isActorAdmin && isAdminOnlyPermission(p.key);

                        return (
                          <div
                            key={p.key}
                            className="py-2 flex items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <span className="font-medium text-ink block">{p.label}</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-ink-faint">{p.key}</span>
                                <span className="text-[10px] text-ink-muted">
                                  (Role: {inRole ? "Allowed" : "Denied"}
                                  {lockedAdmin ? " · Admin only" : ""})
                                </span>
                              </div>
                            </div>

                            {/* 3-State Toggle Segment */}
                            <div
                              className={cn(
                                "flex items-center rounded-control border border-divider p-0.5 bg-surface-muted shrink-0 text-[11px]",
                                lockedAdmin && "opacity-45 pointer-events-none",
                              )}
                            >
                              <button
                                type="button"
                                disabled={lockedAdmin}
                                title="Inherit from role"
                                onClick={() => setOverrideState(p.key, "inherit")}
                                className={cn(
                                  "px-2 py-0.5 rounded-[4px] font-medium transition-colors",
                                  !hasOverride
                                    ? "bg-surface-strong text-ink font-semibold"
                                    : "text-ink-muted hover:text-ink"
                                )}
                              >
                                Role
                              </button>
                              <button
                                type="button"
                                disabled={lockedAdmin}
                                title="Explicitly Grant"
                                onClick={() => setOverrideState(p.key, "grant")}
                                className={cn(
                                  "flex items-center gap-0.5 px-2 py-0.5 rounded-[4px] font-medium transition-colors",
                                  hasOverride && overrideVal === true
                                    ? "bg-positive-soft text-positive font-bold"
                                    : "text-ink-muted hover:text-positive"
                                )}
                              >
                                <Plus size={11} /> Grant
                              </button>
                              <button
                                type="button"
                                disabled={lockedAdmin}
                                title="Explicitly Revoke"
                                onClick={() => setOverrideState(p.key, "revoke")}
                                className={cn(
                                  "flex items-center gap-0.5 px-2 py-0.5 rounded-[4px] font-medium transition-colors",
                                  hasOverride && overrideVal === false
                                    ? "bg-negative-soft text-negative font-bold"
                                    : "text-ink-muted hover:text-negative"
                                )}
                              >
                                <Minus size={11} /> Revoke
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-tile bg-negative-soft p-3 text-xs text-negative">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="sticky bottom-0 -mx-6 -mb-5 mt-6 flex items-center justify-end gap-2 border-t border-divider bg-surface-strong px-6 py-4">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} disabled={fetching}>
            Save Permissions
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
