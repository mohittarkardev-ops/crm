"use client";

import React, { useState, useRef } from "react";
import {
  Lock,
  Search,
  CheckCircle2,
  TriangleAlert,
  Car,
  PlusCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { CustomSelect } from "@/components/ui/custom-select";
import { DatePicker } from "@/components/ui/date-picker";
import { CONTROL } from "@/components/ui/field";
import {
  lookupClaimVehicle,
  submitPortalClaim,
  unlockClaimPortal,
  type PortalEmployee,
  type PortalLookup,
} from "@/lib/actions/claim-portal";
import { cn } from "@/lib/cn";
import { todayIST } from "@/lib/dates";
import { formatDate } from "@/lib/format";

const PAYMENT_MODES = [
  { value: "Online", label: "Online" },
  { value: "GPay(UPI)", label: "GPay (UPI)" },
  { value: "NEFT", label: "NEFT" },
  { value: "Cheque", label: "Cheque" },
];

const VEHICLE_CATEGORIES = [
  { value: "2W", label: "Two wheeler (2W)" },
  { value: "4W", label: "Four wheeler (4W)" },
  { value: "CV", label: "Commercial vehicle (CV)" },
];

type BusyState = "unlock" | "lookup" | "submit" | null;

export function ClaimPortal() {
  // Step 1: Access code
  const [code, setCode] = useState("");
  const [employees, setEmployees] = useState<PortalEmployee[] | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);

  // Step 2: Form & Lookup State
  const [employeeId, setEmployeeId] = useState("");
  const [regInput, setRegInput] = useState("");
  const [paymentMode, setPaymentMode] = useState("Online");
  const [remarks, setRemarks] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayIST());

  // Unknown vehicle fields
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [vehicleGroup, setVehicleGroup] = useState("");
  const [saodDueDate, setSaodDueDate] = useState("");

  const [lookup, setLookup] = useState<PortalLookup | null>(null);
  const [busy, setBusy] = useState<BusyState>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitSuccess, setSubmitSuccess] = useState<{
    vehicle: string;
    message: string;
    isUnknown: boolean;
  } | null>(null);

  const regInputRef = useRef<HTMLInputElement>(null);

  // 1. Unlock Portal with Access Code
  async function handleUnlock(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !code.trim()) return;
    setBusy("unlock");
    setLockError(null);
    try {
      const res = await unlockClaimPortal(code);
      if (res.ok) {
        setEmployees(res.employees);
      } else {
        setLockError(res.error);
      }
    } catch {
      setLockError("Something went wrong. Please check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  // 2. Lookup Vehicle Reg No
  async function handleCheckVehicle() {
    const cleanReg = regInput.toUpperCase().replace(/\s+/g, "");
    if (busy || !cleanReg) return;

    setBusy("lookup");
    setErrors({});
    setSubmitSuccess(null);

    try {
      const res = await lookupClaimVehicle(code, cleanReg);
      if (res.ok) {
        setLookup(res);
      } else {
        setLookup(null);
        setErrors({ vehicleRegNo: res.error });
      }
    } catch {
      setLookup(null);
      setErrors({ vehicleRegNo: "Unable to verify vehicle. Please try again." });
    } finally {
      setBusy(null);
    }
  }

  // 3. Submit Claim Form
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !lookup || !lookup.ok || lookup.state === "claimed" || !employeeId) return;

    setBusy("submit");
    setErrors({});

    try {
      const cleanReg = regInput.toUpperCase().replace(/\s+/g, "");
      const res = await submitPortalClaim(code, {
        employeeId,
        vehicleRegNo: cleanReg,
        paymentDate,
        paymentMode,
        remarks,
        customerName,
        customerMobile,
        vehicleGroup,
        saodDueDate,
      });

      if (res.ok) {
        setSubmitSuccess({
          vehicle: cleanReg,
          message: res.message || "Claim submitted successfully.",
          isUnknown: lookup.state === "unknown",
        });
      } else {
        setErrors(res.fieldErrors || { form: res.error || "Failed to submit claim." });
      }
    } catch {
      setErrors({ form: "Network error occurred while submitting. Please try again." });
    } finally {
      setBusy(null);
    }
  }

  // 4. Reset to claim another vehicle (keeps agent selection intact)
  function handleClaimAnother() {
    setRegInput("");
    setLookup(null);
    setRemarks("");
    setCustomerName("");
    setCustomerMobile("");
    setVehicleGroup("");
    setSaodDueDate("");
    setErrors({});
    setSubmitSuccess(null);
    setTimeout(() => regInputRef.current?.focus(), 50);
  }

  // =========================================================================
  // VIEW 1: Access Code Gate
  // =========================================================================
  if (!employees) {
    return (
      <Card className="mx-auto w-full max-w-md p-6 sm:p-8">
        <form onSubmit={handleUnlock} className="space-y-5">
          <div className="flex items-center gap-3 border-b border-divider pb-4">
            <span className="grid size-11 place-items-center rounded-control bg-ink text-white shrink-0">
              <Lock size={20} strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Agent Access Required</h2>
              <p className="text-xs text-ink-muted">Enter the authorization code to continue</p>
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-muted">
              Portal Access Code <span className="text-negative">*</span>
            </span>
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="off"
              autoFocus
              required
              className={cn(CONTROL, "h-11 tracking-widest text-base")}
            />
            <span className="text-[11px] text-ink-faint">
              Contact the SecureDrive operations desk if you do not have this code.
            </span>
          </label>

          {lockError && (
            <div className="flex items-start gap-2 rounded-control bg-negative-soft p-3 text-xs text-negative">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" />
              <span>{lockError}</span>
            </div>
          )}

          <Button type="submit" loading={busy === "unlock"} className="w-full h-11 text-sm font-semibold">
            Unlock Portal
            <ArrowRight size={16} className="ml-1.5" />
          </Button>

          <div className="pt-2 text-center text-[11px] text-ink-faint">
            For authorised SecureDrive agents only.
          </div>
        </form>
      </Card>
    );
  }

  // =========================================================================
  // VIEW 2: Success Confirmation Screen
  // =========================================================================
  if (submitSuccess) {
    const selectedAgentName = employees.find((e) => e.id === employeeId)?.name || "Agent";
    return (
      <Card className="mx-auto w-full max-w-xl p-6 sm:p-8 text-center space-y-6">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-positive-soft text-positive">
          <CheckCircle2 size={36} strokeWidth={2} />
        </div>

        <div>
          <h2 className="text-[15px] font-semibold text-ink">Claim Submitted Successfully</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {submitSuccess.isUnknown
              ? "New vehicle claim registered. An admin will verify details and approve."
              : "Vehicle claim recorded and linked to client policy records."}
          </p>
        </div>

        {/* Claim Details Card */}
        <div className="rounded-tile border border-divider bg-surface-muted/60 p-4 text-left space-y-2.5">
          <div className="flex items-center justify-between border-b border-divider/60 pb-2 text-xs">
            <span className="text-ink-muted">Vehicle Registration</span>
            <span className="font-bold text-ink uppercase tracking-wider tabular-nums">
              {submitSuccess.vehicle}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-divider/60 pb-2 text-xs">
            <span className="text-ink-muted">Agent</span>
            <span className="font-semibold text-ink">{selectedAgentName}</span>
          </div>
          <div className="flex items-center justify-between border-b border-divider/60 pb-2 text-xs">
            <span className="text-ink-muted">Payment Mode</span>
            <span className="font-medium text-ink">{paymentMode}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-muted">Status</span>
            <Chip tone={submitSuccess.isUnknown ? "warning" : "positive"}>
              {submitSuccess.isUnknown ? "Pending Approval" : "Submitted"}
            </Chip>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button onClick={handleClaimAnother} className="w-full sm:w-auto h-11 px-6 text-sm font-semibold">
            <PlusCircle size={16} className="mr-2" />
            Claim Another Vehicle
          </Button>
          <Button
            variant="secondary"
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto h-11 px-6 text-sm"
          >
            Finished / Log Out
          </Button>
        </div>
      </Card>
    );
  }

  // =========================================================================
  // VIEW 3: Full-Fledged Interactive Claim Form
  // =========================================================================
  const claimed = lookup?.ok && lookup.state === "claimed";
  const unknown = lookup?.ok && lookup.state === "unknown";
  const known = lookup?.ok && lookup.state === "known";
  const isVehicleVerified = Boolean(lookup?.ok) && !claimed;
  const canSubmit = isVehicleVerified && Boolean(employeeId);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Card 1: Agent & Vehicle Registration Number (Spacious & Responsive) */}
      {/* ------------------------------------------------------------------ */}
      <Card className="p-5 sm:p-6">
        <CardHeader
          title="Agent & Vehicle Lookup"
          action={<Chip tone="accent">Step 1 of 2</Chip>}
        />

        <div className="grid gap-5 sm:grid-cols-12 items-start">
          {/* Agent Selection (Spacious 5-columns) */}
          <div className="sm:col-span-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-muted">
                Agent / Employee Name <span className="text-negative">*</span>
              </span>
              <CustomSelect
                value={employeeId}
                onChange={(val) => {
                  setEmployeeId(val);
                  if (errors.employeeId) setErrors((prev) => ({ ...prev, employeeId: "" }));
                }}
                options={employees.map((emp) => ({
                  value: emp.id,
                  label: emp.name,
                }))}
                placeholder="Select your name"
                searchable
                clearable
                invalid={Boolean(errors.employeeId)}
                className="h-11"
              />
              {errors.employeeId ? (
                <span className="text-xs text-negative">{errors.employeeId}</span>
              ) : (
                <span className="text-[11px] text-ink-muted">Claims will be credited to this profile.</span>
              )}
            </label>
          </div>

          {/* Vehicle Registration Number (Spacious 7-columns with Indian Plate Aesthetic) */}
          <div className="sm:col-span-7">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-muted flex items-center justify-between">
                <span>
                  Vehicle Reg. Number <span className="text-negative">*</span>
                </span>
                <span className="text-[11px] font-normal text-ink-muted">e.g. DL01AB1234 or UP85XY9999</span>
              </span>

              <div className="flex gap-2">
                {/* Monospace license-plate styled input */}
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none text-ink-muted select-none border-r border-divider pr-2.5">
                    <span className="rounded-[3px] bg-accent-soft px-1 text-[9px] font-bold text-ink">IND</span>
                    <Car size={15} />
                  </div>
                  <input
                    ref={regInputRef}
                    type="text"
                    value={regInput}
                    onChange={(e) => {
                      setRegInput(e.target.value.toUpperCase());
                      setLookup(null);
                      if (errors.vehicleRegNo) setErrors((prev) => ({ ...prev, vehicleRegNo: "" }));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleCheckVehicle();
                      }
                    }}
                    placeholder="UP85AB1234"
                    maxLength={15}
                    autoCapitalize="characters"
                    autoComplete="off"
                    className={cn(
                      CONTROL,
                      "h-11 pl-16 pr-3 text-base font-bold uppercase tracking-wider tabular-nums text-ink transition-all focus:border-accent-strong",
                      errors.vehicleRegNo && "border-negative focus:border-negative"
                    )}
                  />
                </div>

                {/* Primary Verify Button */}
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => void handleCheckVehicle()}
                  loading={busy === "lookup"}
                  disabled={!regInput.trim()}
                  className="h-11 px-5 text-xs font-semibold shrink-0"
                >
                  <Search size={15} className="mr-1.5" />
                  Verify
                </Button>
              </div>

              {errors.vehicleRegNo ? (
                <span className="text-xs text-negative font-medium">{errors.vehicleRegNo}</span>
              ) : (
                <span className="text-[11px] text-ink-faint">
                  Type vehicle number and press Enter or click Verify.
                </span>
              )}
            </label>
          </div>
        </div>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Card 2: Vehicle Record Status & Verification Result */}
      {/* ------------------------------------------------------------------ */}
      <Card className="p-5 sm:p-6 transition-all duration-200">
        <CardHeader
          title="Vehicle Record Status"
          action={
            lookup?.ok && (
              <Chip
                tone={
                  lookup.state === "known"
                    ? "positive"
                    : lookup.state === "unknown"
                    ? "warning"
                    : "negative"
                }
              >
                {lookup.state === "known"
                  ? "Existing Policy"
                  : lookup.state === "unknown"
                  ? "New Vehicle"
                  : "Already Claimed"}
              </Chip>
            )
          }
        />

        {/* State A: Not searched yet */}
        {!lookup && (
          <div className="grid min-h-36 place-items-center rounded-tile border border-dashed border-divider bg-surface-muted/20 p-6 text-center">
            <div className="max-w-sm space-y-1.5">
              <Search size={24} className="mx-auto text-ink-muted mb-2" />
              <p className="text-sm font-semibold text-ink">Enter vehicle number above to begin</p>
              <p className="text-xs text-ink-muted">
                Existing CRM policies will load customer and renewal dates immediately. Unregistered vehicles can be submitted for verification.
              </p>
            </div>
          </div>
        )}

        {/* State B: Already Claimed */}
        {claimed && lookup?.ok && lookup.state === "claimed" && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-tile bg-negative-soft p-4 text-negative"
          >
            <TriangleAlert size={20} strokeWidth={2} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold">Duplicate Claim Blocked</p>
              <p className="mt-1 text-xs text-negative/90 leading-relaxed">{lookup.message}</p>
              <p className="mt-2 text-[11px] font-medium text-negative/70">
                If this claim belongs to you or was recorded incorrectly, please contact the CRM admin.
              </p>
            </div>
          </div>
        )}

        {/* State C: Known Vehicle (Existing Policy in SecureDrive CRM) */}
        {known && lookup?.ok && lookup.state === "known" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-tile bg-positive-soft px-3.5 py-2.5 text-xs text-positive font-medium">
              <CheckCircle2 size={16} strokeWidth={2} className="shrink-0" />
              <span>
                Vehicle <b>{lookup.vehicle}</b> verified in database. Confirm the customer details below.
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-tile border border-divider bg-surface-muted/50 p-3">
                <span className="block text-[10px] uppercase font-semibold text-ink-muted tracking-wider">
                  Vehicle Reg No.
                </span>
                <span className="mt-1 block text-sm font-bold text-ink uppercase tracking-wider tabular-nums">
                  {lookup.vehicle}
                </span>
              </div>
              <div className="rounded-tile border border-divider bg-surface-muted/50 p-3">
                <span className="block text-[10px] uppercase font-semibold text-ink-muted tracking-wider">
                  Customer / Owner Name
                </span>
                <span className="mt-1 block text-sm font-semibold text-ink truncate">
                  {lookup.customer}
                </span>
              </div>
              <div className="rounded-tile border border-divider bg-surface-muted/50 p-3">
                <span className="block text-[10px] uppercase font-semibold text-ink-muted tracking-wider">
                  SAOD Due Date
                </span>
                <span className="mt-1 block text-sm font-semibold text-ink tabular-nums">
                  {lookup.saodDue ? formatDate(lookup.saodDue) : "Not recorded"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* State D: Unknown Vehicle (Requires customer details for admin verification) */}
        {unknown && lookup?.ok && lookup.state === "unknown" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-tile bg-warning-soft p-4 text-warning">
              <TriangleAlert size={20} strokeWidth={2} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold">New Vehicle — Approval Required</p>
                <p className="mt-0.5 text-xs text-warning/90">
                  Vehicle <b>{lookup.vehicle}</b> is not in current CRM records. Fill in customer details so the admin can review and approve this claim.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-1">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-ink-muted">
                  Customer Name <span className="text-negative">*</span>
                </span>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  maxLength={120}
                  className={cn(CONTROL, "h-10", errors.customerName && "border-negative")}
                />
                {errors.customerName && (
                  <span className="text-xs text-negative">{errors.customerName}</span>
                )}
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-ink-muted">
                  Customer Mobile <span className="text-negative">*</span>
                </span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-ink-muted">
                    +91
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    placeholder="9876543210"
                    maxLength={10}
                    className={cn(CONTROL, "h-10 pl-11 tabular-nums", errors.customerMobile && "border-negative")}
                  />
                </div>
                {errors.customerMobile && (
                  <span className="text-xs text-negative">{errors.customerMobile}</span>
                )}
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-ink-muted">
                  Vehicle Category <span className="text-negative">*</span>
                </span>
                <CustomSelect
                  value={vehicleGroup}
                  onChange={(val) => setVehicleGroup(val)}
                  options={VEHICLE_CATEGORIES}
                  placeholder="Select category"
                  invalid={Boolean(errors.vehicleGroup)}
                />
                {errors.vehicleGroup && (
                  <span className="text-xs text-negative">{errors.vehicleGroup}</span>
                )}
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-ink-muted">
                  SAOD Due Date <span className="text-negative">*</span>
                </span>
                <DatePicker
                  value={saodDueDate}
                  onChange={(val) => setSaodDueDate(val)}
                  placeholder="Select SAOD date"
                  invalid={Boolean(errors.saodDueDate)}
                />
                {errors.saodDueDate && (
                  <span className="text-xs text-negative">{errors.saodDueDate}</span>
                )}
              </label>
            </div>
          </div>
        )}
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Card 3: Payment & Claim Transaction Details */}
      {/* ------------------------------------------------------------------ */}
      <Card className="p-5 sm:p-6">
        <CardHeader
          title="Payment & Claim Transaction Details"
          action={<Chip tone="accent">Step 2 of 2</Chip>}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-muted">
              Payment Date <span className="text-negative">*</span>
            </span>
            <DatePicker
              value={paymentDate}
              onChange={(val) => setPaymentDate(val)}
              maxToday
              invalid={Boolean(errors.paymentDate)}
            />
            {errors.paymentDate ? (
              <span className="text-xs text-negative">{errors.paymentDate}</span>
            ) : (
              <span className="text-[11px] text-ink-faint">Date payment was received.</span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-muted">
              Payment Mode <span className="text-negative">*</span>
            </span>
            <CustomSelect
              value={paymentMode}
              onChange={(val) => setPaymentMode(val)}
              options={PAYMENT_MODES}
              placeholder="Select payment mode"
              invalid={Boolean(errors.paymentMode)}
            />
            {errors.paymentMode && (
              <span className="text-xs text-negative">{errors.paymentMode}</span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-muted">Transaction Remarks / UTR</span>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. UTR12345678 or Policy Renewal"
              maxLength={500}
              className={cn(CONTROL, "h-10")}
            />
            <span className="text-[11px] text-ink-faint">Optional reference note or UTR number.</span>
          </label>
        </div>
      </Card>

      {/* Global Form Errors */}
      {errors.form && (
        <div className="flex items-center gap-2 rounded-control bg-negative-soft p-3 text-xs text-negative">
          <TriangleAlert size={16} className="shrink-0" />
          <span>{errors.form}</span>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Submission Action Bar */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="text-xs text-ink-muted">
          {!employeeId ? (
            <span className="text-negative font-medium">Please select your name above.</span>
          ) : !lookup ? (
            <span>Verify the vehicle registration number before submitting.</span>
          ) : claimed ? (
            <span className="text-negative font-medium">Cannot claim an already claimed vehicle.</span>
          ) : (
            <span className="text-positive font-medium flex items-center gap-1">
              <CheckCircle2 size={14} /> Ready to submit claim.
            </span>
          )}
        </div>

        <Button
          type="submit"
          loading={busy === "submit"}
          disabled={!canSubmit}
          className="w-full sm:w-auto h-11 px-8 text-sm font-semibold"
        >
          {unknown ? "Request Admin Approval" : "Confirm & Submit Claim"}
          <ArrowRight size={16} className="ml-1.5" />
        </Button>
      </div>
    </form>
  );
}
