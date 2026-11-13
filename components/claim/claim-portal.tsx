"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  Search,
  CheckCircle2,
  TriangleAlert,
  AlertCircle,
  Info,
  ShieldCheck,
  Car,
  Bike,
  Truck,
  PlusCircle,
  ArrowRight,
  UploadCloud,
  FileText,
  ChevronDown,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ClaimTrophyCharacter, PortalVaultCharacter, VehicleScoutCharacter } from "@/components/ui/characters";
import { Chip } from "@/components/ui/chip";
import { CopyButton } from "@/components/ui/copy-button";
import { CustomSelect } from "@/components/ui/custom-select";
import { DatePicker } from "@/components/ui/date-picker";
import { CONTROL } from "@/components/ui/field";
import { ClaimGuideBanner, type ClaimMascotMood } from "@/components/claim/claim-portal-mascot";
import {
  lookupClaimVehicle,
  submitPortalClaim,
  unlockClaimPortal,
  type PortalEmployee,
  type PortalInsurer,
  type PortalLookup,
} from "@/lib/actions/claim-portal";
import { cn } from "@/lib/cn";
import { todayIST } from "@/lib/dates";
import { formatDate, formatINR } from "@/lib/format";
import { DOCUMENT_TYPE_OPTIONS } from "@/lib/options";
import { OTHER_INSURER_VALUE } from "@/lib/policy-fields";
import { STATE_OPTIONS } from "@/lib/states";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/upload-limits";
import {
  EMBEDDED_VEHICLE_CATALOG,
  getMakesForCategory,
  getModelsForMake,
  normalizeVehicleCategory,
  type VehicleCatalogEntry,
} from "@/lib/vehicle-catalog";
import {
  validateIndianVehicleNumber,
  type VehicleValidationResult,
} from "@/lib/vehicle-validation";

const ALLOWED_DOC_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

const PAYMENT_MODES = [
  { value: "Online", label: "Online" },
  { value: "GPay(UPI)", label: "GPay (UPI)" },
  { value: "NEFT", label: "NEFT" },
  { value: "Cheque", label: "Cheque" },
  { value: "Cash", label: "Cash" },
];

const VEHICLE_CATEGORIES = [
  { value: "2W", label: "Two wheeler (2W)" },
  { value: "4W", label: "Four wheeler (4W)" },
  { value: "CW", label: "Commercial vehicle (CW)" },
];

const PORTAL_STATE_OPTIONS = [{ value: "", label: "Auto-resolve from PIN" }, ...STATE_OPTIONS];

type BusyState = "unlock" | "lookup" | "submit" | null;

export function ClaimPortal() {
  // Step 1: Access code
  const [code, setCode] = useState("");
  const [employees, setEmployees] = useState<PortalEmployee[] | null>(null);
  const [insurers, setInsurers] = useState<PortalInsurer[]>([]);
  const [lockError, setLockError] = useState<string | null>(null);
  const [lockErrorPulse, setLockErrorPulse] = useState(0);
  const [formErrorPulse, setFormErrorPulse] = useState(0);

  // Step 2: Form & Lookup State
  const [employeeId, setEmployeeId] = useState("");
  const [regInput, setRegInput] = useState("");
  const [paymentMode, setPaymentMode] = useState("Online");
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayIST());
  const [customerPincode, setCustomerPincode] = useState("");
  const [customerState, setCustomerState] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("Policy copy");
  const [isDraggingDoc, setIsDraggingDoc] = useState(false);

  // Policy & renewal fields (mandatory for both existing and new vehicles)
  const [policyNumber, setPolicyNumber] = useState("");
  const [insurer, setInsurer] = useState("");
  const [insurerCustom, setInsurerCustom] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Unknown vehicle fields (Personal + Vehicle details)
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [vehicleGroup, setVehicleGroup] = useState("4W");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [idv, setIdv] = useState("");
  const [vehicleCatalog, setVehicleCatalog] = useState<VehicleCatalogEntry[]>(EMBEDDED_VEHICLE_CATALOG);

  // Make options based on selected vehicleGroup ("2W", "4W", "CW")
  const makeOptions = useMemo(() => {
    const normCat = vehicleGroup ? (normalizeVehicleCategory(vehicleGroup) ?? undefined) : undefined;
    const makes = getMakesForCategory(normCat, vehicleCatalog);
    return makes.map((m) => ({ value: m, label: m }));
  }, [vehicleGroup, vehicleCatalog]);

  // Model options based on selected Make and vehicleGroup
  const modelOptions = useMemo(() => {
    if (!vehicleMake) return [];
    const normCat = vehicleGroup ? (normalizeVehicleCategory(vehicleGroup) ?? undefined) : undefined;
    const models = getModelsForMake(vehicleMake, normCat, vehicleCatalog);
    const opts = models.map((m) => ({ value: m, label: m }));
    opts.push({ value: "__OTHER__", label: "Other / Custom Model…" });
    return opts;
  }, [vehicleMake, vehicleGroup, vehicleCatalog]);

  const [lookup, setLookup] = useState<PortalLookup | null>(null);
  const [busy, setBusy] = useState<BusyState>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [regValidation, setRegValidation] = useState<VehicleValidationResult | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<{
    vehicle: string;
    message: string;
    refCode: string;
    isUnknown: boolean;
    amountNum: number | null;
    documentName: string | null;
    documentAttached: boolean;
  } | null>(null);

  const regInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);

  // Debounced offline vehicle registration format validation
  useEffect(() => {
    const raw = regInput.trim();
    if (!raw || raw.length < 3) {
      setRegValidation(null);
      return;
    }

    const timer = setTimeout(() => {
      const result = validateIndianVehicleNumber(raw, { vehicleCategory: vehicleGroup });
      setRegValidation(result);
      if (result.status === "INVALID") {
        setErrors((prev) => ({ ...prev, vehicleRegNo: result.message }));
      } else {
        setErrors((prev) => {
          if (!prev.vehicleRegNo) return prev;
          const { vehicleRegNo, ...rest } = prev;
          return rest;
        });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [regInput, vehicleGroup]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(e.target as Node)) {
        setCategoryMenuOpen(false);
      }
    }
    if (categoryMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [categoryMenuOpen]);

  // Dynamic mascot guide calculation based on live form state
  const { guideMood, guideTitle, guideMessage, guideBadgeText, guideBadgeTone } = useMemo<{
    guideMood: ClaimMascotMood;
    guideTitle: string;
    guideMessage: string;
    guideBadgeText: string;
    guideBadgeTone: "accent" | "positive" | "warning" | "negative" | "neutral";
  }>(() => {
    if (busy === "lookup") {
      return {
        guideMood: "searching",
        guideTitle: "Searching CRM Database",
        guideMessage: `Checking active policies and duplicate claims for plate ${regInput.toUpperCase()}…`,
        guideBadgeText: "Verifying…",
        guideBadgeTone: "accent",
      };
    }
    if (lookup?.ok && lookup.state === "claimed") {
      return {
        guideMood: "claimed_warn",
        guideTitle: "Duplicate Claim Blocked",
        guideMessage: "This vehicle has already been claimed for this period. If this is an error, please inform the operations admin.",
        guideBadgeText: "Duplicate Blocked",
        guideBadgeTone: "negative",
      };
    }
    if (lookup?.ok && lookup.state === "known") {
      const hasCleanIdv = Boolean(idv.trim() && Number.isFinite(Number(idv.replace(/,/g, ""))) && Number(idv.replace(/,/g, "")) > 0);
      const isMissingOrigIdv = !lookup.idv || lookup.idv === 0;

      if (isMissingOrigIdv && !hasCleanIdv) {
        return {
          guideMood: "known_found",
          guideTitle: "Vehicle Verified · IDV Missing",
          guideMessage: `Vehicle ${lookup.vehicle} matched, but IDV is not yet recorded! Please enter the renewed IDV in Step 2 so your client's mobile app shows full policy valuation.`,
          guideBadgeText: "Update IDV in Step 2",
          guideBadgeTone: "warning",
        };
      }

      if (documentFile) {
        const idvLabel = hasCleanIdv ? ` · IDV ₹${Number(idv.replace(/,/g, "")).toLocaleString("en-IN")}` : "";
        return {
          guideMood: "ready",
          guideTitle: "Ready for Submission",
          guideMessage: `Policy document "${documentFile.name}" attached${idvLabel}! Confirm details and click "Confirm & Submit Claim".`,
          guideBadgeText: "Ready to Submit",
          guideBadgeTone: "positive",
        };
      }
      return {
        guideMood: "known_found",
        guideTitle: "Existing Policy Verified",
        guideMessage: `Vehicle ${lookup.vehicle} matched in database! Confirm details, enter the new renewal policy number, IDV & amount, and upload the policy copy.`,
        guideBadgeText: "Existing Record Found",
        guideBadgeTone: "positive",
      };
    }
    if (lookup?.ok && lookup.state === "unknown") {
      if (documentFile) {
        return {
          guideMood: "ready",
          guideTitle: "Approval Request Ready",
          guideMessage: `New vehicle details complete with policy document attached. Click "Request Admin Approval" to submit!`,
          guideBadgeText: "Ready to Request",
          guideBadgeTone: "positive",
        };
      }
      return {
        guideMood: "unknown_guide",
        guideTitle: "New Vehicle Registration",
        guideMessage: `Vehicle ${lookup.vehicle} is not in CRM yet. Pick vehicle type, Make & Model from dropdowns, enter owner details, and attach the policy copy.`,
        guideBadgeText: "Approval Required",
        guideBadgeTone: "warning",
      };
    }
    if (errors.vehicleRegNo) {
      return {
        guideMood: "claimed_warn",
        guideTitle: "Registration Format Error",
        guideMessage: errors.vehicleRegNo,
        guideBadgeText: "Format Error",
        guideBadgeTone: "negative",
      };
    }
    if (regValidation && regValidation.status === "VALID") {
      const typeLabel =
        regValidation.registrationType === "BH_SERIES"
          ? "Bharat Series (BH)"
          : regValidation.registrationType === "TEMPORARY"
          ? "Temporary Permit"
          : regValidation.registrationType === "LEGACY"
          ? "Legacy Plate"
          : "Standard State";
      return {
        guideMood: "ready",
        guideTitle: `${typeLabel} Verified`,
        guideMessage: `${regValidation.message} Click "Verify" or press Enter to search CRM policy records.`,
        guideBadgeText: regValidation.registrationType === "BH_SERIES" ? "BH Series" : "Format valid",
        guideBadgeTone: "positive",
      };
    }
    if (regValidation && regValidation.status === "NEEDS_MANUAL_REVIEW") {
      return {
        guideMood: "unknown_guide",
        guideTitle: "Manual Verification Required",
        guideMessage: `${regValidation.message} This registration will be queued for admin document review.`,
        guideBadgeText: "Manual review",
        guideBadgeTone: "warning",
      };
    }
    if (regInput.trim().length >= 4) {
      return {
        guideMood: "scout",
        guideTitle: "Plate Entered",
        guideMessage: `Press Enter or click "Verify" to verify plate ${regInput.toUpperCase()} against active CRM records.`,
        guideBadgeText: "Ready to verify",
        guideBadgeTone: "accent",
      };
    }
    return {
      guideMood: "scout",
      guideTitle: "Agent Claim Assistant",
      guideMessage: "Select your agent profile, choose vehicle category (2W, 4W, or CW), and enter the registration number to begin.",
      guideBadgeText: "Step 1: Lookup",
      guideBadgeTone: "accent",
    };
  }, [busy, lookup, regInput, documentFile, regValidation, errors.vehicleRegNo]);

  const insurerOptions = useMemo(
    () => [
      ...insurers.map((i) => ({
        value: i.name,
        label: i.name,
        logoUrl: i.logoUrl,
        showBadge: true,
      })),
      {
        value: OTHER_INSURER_VALUE,
        label: "Other / Add new insurer…",
        hint: "Save a new company to the insurers list",
      },
    ],
    [insurers],
  );

  function pickDocumentFile(file: File | null) {
    if (!file) return;
    if (!ALLOWED_DOC_TYPES.includes(file.type)) {
      setDocumentFile(null);
      if (docInputRef.current) docInputRef.current.value = "";
      setErrors((prev) => ({
        ...prev,
        document: "Documents must be a PDF, JPG, PNG or WebP file.",
      }));
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setDocumentFile(null);
      if (docInputRef.current) docInputRef.current.value = "";
      setErrors((prev) => ({
        ...prev,
        document: `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. Choose a file of ${MAX_UPLOAD_LABEL} or less.`,
      }));
      return;
    }
    setDocumentFile(file);
    setErrors((prev) => ({ ...prev, document: "" }));
  }

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
        setInsurers(res.insurers);
        if (res.vehicleCatalog && res.vehicleCatalog.length > 0) {
          setVehicleCatalog(res.vehicleCatalog);
        }
      } else {
        setLockError(res.error);
        setLockErrorPulse((n) => n + 1);
      }
    } catch {
      setLockError("Something went wrong. Please check your connection and try again.");
      setLockErrorPulse((n) => n + 1);
    } finally {
      setBusy(null);
    }
  }

  // 2. Lookup Vehicle Reg No
  async function handleCheckVehicle() {
    const raw = regInput.trim();
    if (busy || !raw) return;

    const val = validateIndianVehicleNumber(raw, { vehicleCategory: vehicleGroup });
    setRegValidation(val);
    if (val.status === "INVALID") {
      setErrors({ vehicleRegNo: val.message });
      return;
    }

    const cleanReg = val.normalizedNumber;
    setRegInput(cleanReg);
    setBusy("lookup");
    setErrors({});
    setRegValidation(null);
    setSubmitSuccess(null);

    try {
      const res = await lookupClaimVehicle(code, cleanReg);
      if (res.ok) {
        setLookup(res);
        setPolicyNumber("");
        setInsurer("");
        setInsurerCustom("");
        setDueDate("");
        setCustomerName("");
        setCustomerMobile("");
        setIdv("");
        setCustomModel("");
        setCustomerPincode(res.state === "known" && res.pin ? res.pin : "");

        // Auto-select vehicle type & make/model if known in database
        if (res.state === "known") {
          const autoCat = normalizeVehicleCategory(res.typ);
          if (autoCat) setVehicleGroup(autoCat);
          if (res.make) setVehicleMake(res.make);
          if (res.model) setVehicleModel(res.model);
          if (res.idv !== null && res.idv > 0) {
            setIdv(String(res.idv));
          } else {
            setIdv("");
          }
        } else {
          // New vehicle: ensure vehicleGroup has a selection (default 4W)
          if (!vehicleGroup) setVehicleGroup("4W");
          setVehicleMake("");
          setVehicleModel("");
        }
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

  function validateForm(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!employeeId) next.employeeId = "Choose your name.";
    const regCheck = validateIndianVehicleNumber(regInput, { vehicleCategory: vehicleGroup });
    if (regCheck.status === "INVALID") next.vehicleRegNo = regCheck.message;
    if (!lookup || !lookup.ok || lookup.state === "claimed") return next;

    if (lookup.state === "unknown") {
      if (customerName.trim().length < 2) next.customerName = "Enter the owner's name.";
      const digits = customerMobile.replace(/\D/g, "");
      if (digits.length !== 10) next.customerMobile = "Enter a valid 10-digit contact number.";
      if (!vehicleGroup) next.vehicleGroup = "Select vehicle type (2W, 4W or CW).";
      if (!vehicleMake.trim()) next.vehicleMake = "Select the vehicle make from the dropdown.";
      const finalModel = vehicleModel === "__OTHER__" ? customModel.trim() : vehicleModel.trim();
      if (!finalModel) next.vehicleModel = "Select or specify the vehicle model.";
    }

    const idvNum = Number(idv.replace(/,/g, "").trim());
    if (!idv.trim() || !Number.isFinite(idvNum) || idvNum <= 0) {
      next.idv = "Enter a valid vehicle IDV (₹) amount.";
    }

    if (policyNumber.trim().length < 2) next.policyNumber = "Enter the policy number.";
    if (!insurer) next.insurer = "Choose an insurer.";
    else if (insurer === OTHER_INSURER_VALUE && insurerCustom.trim().length < 2) {
      next.insurerCustom = "Enter the new insurer's name.";
    }
    if (!dueDate) next.dueDate = "Select the due date.";

    const amtNum = Number(amount.replace(/,/g, "").trim());
    if (!amount.trim() || !Number.isFinite(amtNum) || amtNum <= 0) {
      next.amount = "Enter the premium / amount paid.";
    }
    if (!paymentDate) next.paymentDate = "Select the payment date.";
    if (!paymentMode) next.paymentMode = "Choose how it was paid.";
    if (!documentFile) next.document = "Upload the policy document.";

    const pin = customerPincode.trim();
    if (pin && !/^\d{6}$/.test(pin)) next.customerPincode = "Enter a valid 6-digit PIN code.";

    return next;
  }

  // 3. Submit Claim Form
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !lookup || !lookup.ok || lookup.state === "claimed" || !employeeId) return;

    const clientErrors = validateForm();
    if (Object.keys(clientErrors).length > 0) {
      setErrors({ ...clientErrors, form: "Please fix the highlighted fields above." });
      setFormErrorPulse((n) => n + 1);
      return;
    }

    setBusy("submit");
    setErrors({});

    try {
      const cleanReg = regInput.toUpperCase().replace(/\s+/g, "");
      const finalModel = vehicleModel === "__OTHER__" ? customModel.trim() : vehicleModel.trim();
      const fd = new FormData();
      fd.set("code", code);
      fd.set("employeeId", employeeId);
      fd.set("vehicleRegNo", cleanReg);
      fd.set("paymentDate", paymentDate);
      fd.set("paymentMode", paymentMode);
      fd.set("amount", amount.trim());
      fd.set("remarks", remarks);
      fd.set("policyNumber", policyNumber.trim());
      fd.set("insurer", insurer);
      fd.set("insurerCustom", insurerCustom.trim());
      fd.set("dueDate", dueDate);
      fd.set("customerName", customerName.trim());
      fd.set("customerMobile", customerMobile.trim());
      fd.set("vehicleGroup", vehicleGroup);
      fd.set("vehicleMake", vehicleMake.trim());
      fd.set("vehicleModel", finalModel);
      fd.set("idv", idv.trim());
      fd.set("customerPincode", customerPincode.trim());
      fd.set("customerState", customerState);
      fd.set("documentType", documentType);
      if (documentFile) fd.set("document", documentFile);

      const res = await submitPortalClaim(fd);

      if (res.ok) {
        const cleanAmt = amount.trim().replace(/,/g, "");
        const parsedAmt = cleanAmt && Number.isFinite(Number(cleanAmt)) ? Number(cleanAmt) : null;
        setSubmitSuccess({
          vehicle: cleanReg,
          message: res.message || "Claim submitted successfully.",
          refCode: res.refCode || "",
          isUnknown: lookup.state === "unknown",
          amountNum: parsedAmt,
          documentName: documentFile ? documentFile.name : null,
          documentAttached: Boolean(res.documentAttached),
        });
      } else {
        setErrors(res.fieldErrors || { form: res.error || "Failed to submit claim." });
        setFormErrorPulse((n) => n + 1);
      }
    } catch {
      setErrors({ form: "Network error occurred while submitting. Please try again." });
      setFormErrorPulse((n) => n + 1);
    } finally {
      setBusy(null);
    }
  }

  // 4. Reset to claim another vehicle (keeps agent selection intact)
  function handleClaimAnother() {
    setRegInput("");
    setLookup(null);
    setAmount("");
    setRemarks("");
    setPolicyNumber("");
    setInsurer("");
    setInsurerCustom("");
    setDueDate("");
    setDocumentFile(null);
    setDocumentType("Policy copy");
    if (docInputRef.current) docInputRef.current.value = "";
    setCustomerName("");
    setCustomerMobile("");
    setVehicleMake("");
    setVehicleModel("");
    setCustomModel("");
    setIdv("");
    setCustomerPincode("");
    setCustomerState("");
    setErrors({});
    setRegValidation(null);
    setSubmitSuccess(null);
    setTimeout(() => regInputRef.current?.focus(), 50);
  }

  // =========================================================================
  // VIEW 1: Access Code Gate
  // =========================================================================
  if (!employees) {
    return (
      <div className="mx-auto w-full max-w-md space-y-4">
        <ClaimGuideBanner
          mood="vault"
          title="Agent Claim Portal"
          message="Welcome, Agent! Enter your 8-digit portal authorization code below to unlock the vehicle claim submission desk."
          badgeText="Authorization Required"
          badgeTone="warning"
        />

        <Card className="p-6 sm:p-8">
          <form onSubmit={handleUnlock} className="space-y-5">
            <div className="flex flex-col items-center gap-2 border-b border-divider pb-4 text-center">
              <PortalVaultCharacter />
              <div>
                <h2 className="text-[15px] font-semibold text-ink">Agent Access Required</h2>
                <p className="mt-0.5 text-xs text-ink-muted">Enter the authorization code to continue</p>
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
              <div
                key={lockErrorPulse}
                role="alert"
                className="micro-shake flex items-start gap-2 rounded-control bg-negative-soft p-3 text-xs text-negative"
              >
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
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: Success Confirmation Screen
  // =========================================================================
  if (submitSuccess) {
    const selectedAgentName = employees.find((e) => e.id === employeeId)?.name || "Agent";
    return (
      <Card className="reveal-down mx-auto w-full max-w-xl p-6 sm:p-8 text-center space-y-6">
        <div className="check-pop">
          <ClaimTrophyCharacter />
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
          {submitSuccess.refCode && (
            <div className="flex items-center justify-between border-b border-divider/60 pb-2 text-xs">
              <span className="text-ink-muted">Reference ID</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-ink uppercase tracking-wider tabular-nums select-text">
                  {submitSuccess.refCode}
                </span>
                <CopyButton
                  text={submitSuccess.refCode}
                  title="Copy reference ID"
                />
              </div>
            </div>
          )}
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
          {submitSuccess.amountNum !== null && (
            <div className="flex items-center justify-between border-b border-divider/60 pb-2 text-xs">
              <span className="text-ink-muted">Payment Amount</span>
              <span className="font-semibold text-ink tabular-nums">{formatINR(submitSuccess.amountNum)}</span>
            </div>
          )}
          {submitSuccess.documentName && (
            <div className="flex items-center justify-between border-b border-divider/60 pb-2 text-xs">
              <span className="text-ink-muted">Policy Document</span>
              <Chip tone={submitSuccess.documentAttached ? "positive" : "warning"}>
                {submitSuccess.documentAttached
                  ? `Queued (${submitSuccess.documentName})`
                  : "Upload skipped"}
              </Chip>
            </div>
          )}
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
    <form onSubmit={handleSubmit} noValidate className="reveal-down space-y-6">
      {/* Interactive Mascot Companion */}
      <ClaimGuideBanner
        mood={guideMood}
        title={guideTitle}
        message={guideMessage}
        badgeText={guideBadgeText}
        badgeTone={guideBadgeTone}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Card 1: Agent & Vehicle Registration Number (Symmetrical 2-Column) */}
      {/* ------------------------------------------------------------------ */}
      <Card className="p-5 sm:p-6">
        <CardHeader
          title="Agent & Vehicle Lookup"
          action={<Chip tone="accent">Step 1 of 2</Chip>}
        />

        <div className="grid gap-5 sm:grid-cols-2 items-start">
          {/* Agent Selection (Left Column) */}
          <div className="flex flex-col gap-1.5">
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
          </div>

          {/* Vehicle Registration Number with Convertible IND Dropdown (Right Column) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-muted flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span>Vehicle Reg. Number</span>
                <span className="text-negative">*</span>
              </span>
              <span className="text-[10.5px] text-ink-faint">
                Category: <b className="text-ink">{vehicleGroup}</b>
              </span>
            </span>

            <div className="flex gap-2">
              {/* Flex plate container with integrated convertible category dropdown */}
              <div
                className={cn(
                  "relative flex h-11 min-w-0 flex-1 items-center rounded-control border bg-white/90 transition-colors",
                  errors.vehicleRegNo
                    ? "border-negative focus-within:border-negative"
                    : "border-divider focus-within:border-accent-strong",
                )}
              >
                {/* Convertible IND + Category Dropdown Trigger */}
                <div className="relative h-full shrink-0" ref={categoryMenuRef}>
                  <button
                    type="button"
                    onClick={() => setCategoryMenuOpen((v) => !v)}
                    title="Click to switch vehicle category (2W, 4W, CW)"
                    className="flex h-full items-center gap-1.5 border-r border-divider bg-surface-muted/65 hover:bg-surface-muted px-2.5 sm:px-3 text-ink transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                  >
                    <span className="rounded-[3px] bg-accent-soft px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-ink">
                      IND
                    </span>
                    {vehicleGroup === "2W" ? (
                      <Bike size={16} className="text-ink" aria-label="Two Wheeler" />
                    ) : vehicleGroup === "CW" ? (
                      <Truck size={16} className="text-ink" aria-label="Commercial Vehicle" />
                    ) : (
                      <Car size={16} className="text-ink" aria-label="Four Wheeler" />
                    )}
                    <span className="text-xs font-bold text-ink tabular-nums">{vehicleGroup}</span>
                    <ChevronDown
                      size={12}
                      className={cn(
                        "text-ink-muted transition-transform duration-150",
                        categoryMenuOpen && "rotate-180",
                      )}
                    />
                  </button>

                  {/* Convertible Category Dropdown Menu */}
                  {categoryMenuOpen && (
                    <div className="absolute left-0 top-full mt-1.5 z-40 w-60 rounded-tile border border-divider bg-surface-strong p-1.5 shadow-elev-2 fade-down">
                      <div className="px-2 py-1 text-xs font-medium text-ink-muted border-b border-divider/60 mb-1">
                        Select category
                      </div>
                      {[
                        { value: "2W", label: "2W · Two Wheeler", desc: "Bike, Scooter, Moped", icon: Bike },
                        { value: "4W", label: "4W · Four Wheeler", desc: "Car, SUV, Hatchback", icon: Car },
                        { value: "CW", label: "CW · Commercial", desc: "Truck, Bus, Taxi, Auto", icon: Truck },
                      ].map((cat) => {
                        const isSelected = vehicleGroup === cat.value;
                        const Icon = cat.icon;
                        return (
                          <button
                            key={cat.value}
                            type="button"
                            onClick={() => {
                              setVehicleGroup(cat.value);
                              setVehicleMake("");
                              setVehicleModel("");
                              setCustomModel("");
                              setCategoryMenuOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-left text-xs transition-colors",
                              isSelected
                                ? "bg-accent/35 font-semibold text-ink"
                                : "text-ink hover:bg-surface-muted",
                            )}
                          >
                            <div
                              className={cn(
                                "flex size-7 items-center justify-center rounded-control shrink-0",
                                isSelected ? "bg-accent" : "bg-surface-muted",
                              )}
                            >
                              <Icon size={14} className="text-ink" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold">{cat.label}</span>
                                {isSelected && <span className="text-[10px] text-positive font-bold">✓</span>}
                              </div>
                              <span className="text-[10px] text-ink-muted block truncate">{cat.desc}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
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
                  onBlur={() => {
                    const raw = regInput.trim();
                    if (raw.length >= 3) {
                      const result = validateIndianVehicleNumber(raw, { vehicleCategory: vehicleGroup });
                      setRegValidation(result);
                      if (result.status === "INVALID") {
                        setErrors((prev) => ({ ...prev, vehicleRegNo: result.message }));
                      }
                    }
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
                  className="h-full min-w-0 flex-1 bg-transparent px-3 text-base font-bold uppercase tracking-wider tabular-nums text-ink outline-none placeholder:font-semibold placeholder:text-ink-faint"
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

            {/* Real-time offline validation feedback */}
            {errors.vehicleRegNo ? (
              <div className="reveal-down flex items-start gap-1.5 rounded-tile border border-negative/30 bg-negative-soft/60 px-3 py-2 text-xs text-negative font-medium">
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-negative" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-negative">Invalid Registration Format</p>
                  <p className="mt-0.5 text-[11px] text-negative/90 leading-tight">{errors.vehicleRegNo}</p>
                </div>
              </div>
            ) : regValidation && regValidation.status === "VALID" ? (
              <div className="reveal-down rounded-tile border border-positive/30 bg-positive-soft/60 px-3 py-2 text-xs text-ink space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-semibold text-positive">
                    <CheckCircle2 size={15} className="text-positive shrink-0" />
                    <span>
                      Valid {regValidation.registrationType === "BH_SERIES" ? "BH Series" : regValidation.registrationType === "TEMPORARY" ? "Temporary" : regValidation.registrationType === "LEGACY" ? "Legacy" : "Regular"} Registration
                    </span>
                    {regValidation.stateName && (
                      <span className="text-[11px] font-medium text-ink-muted">· {regValidation.stateName}</span>
                    )}
                  </div>
                  <span className="font-mono text-[11px] font-bold text-ink bg-white/80 px-2 py-0.5 rounded border border-divider/60 tabular-nums">
                    {regValidation.normalizedNumber}
                  </span>
                </div>
                {regValidation.warnings.length > 0 && (
                  <p className="text-[11px] text-ink-muted flex items-center gap-1">
                    <Info size={12} className="text-ink-faint shrink-0" />
                    <span>{regValidation.warnings[0]}</span>
                  </p>
                )}
              </div>
            ) : regValidation && regValidation.status === "NEEDS_MANUAL_REVIEW" ? (
              <div className="reveal-down rounded-tile border border-warning/40 bg-warning-soft/60 px-3 py-2 text-xs text-ink space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-semibold text-warning-strong">
                    <TriangleAlert size={15} className="text-warning shrink-0" />
                    <span>Manual Verification Required</span>
                    {regValidation.stateName && (
                      <span className="text-[11px] font-medium text-ink-muted">· {regValidation.stateName}</span>
                    )}
                  </div>
                  <span className="font-mono text-[11px] font-bold text-ink bg-white/80 px-2 py-0.5 rounded border border-divider/60 tabular-nums">
                    {regValidation.normalizedNumber}
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted leading-tight">
                  {regValidation.message} <em>(Claim will be flagged for admin document verification upon submission).</em>
                </p>
              </div>
            ) : (
              <span className="text-[11px] text-ink-muted flex items-center justify-between">
                <span>Type vehicle number and press Enter or click Verify.</span>
                <span className="text-ink-faint hidden sm:inline">e.g. DL01AB1234, 22BH1234AA, or MH12TR1234</span>
              </span>
            )}
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
          <div className="grid min-h-40 place-items-center rounded-tile border border-dashed border-divider bg-surface-muted/20 p-6 text-center">
            <div className="max-w-sm space-y-2">
              <VehicleScoutCharacter />
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
            className="reveal-down flex items-start gap-3 rounded-tile bg-negative-soft p-4 text-negative"
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
          <div className="reveal-down space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-tile bg-positive-soft px-3.5 py-2.5 text-xs text-positive font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} strokeWidth={2} className="shrink-0" />
                <span>
                  Vehicle <b>{lookup.vehicle}</b> verified in database.
                </span>
              </div>
              <span className="text-[11px] font-medium bg-positive/15 px-2.5 py-0.5 rounded-full text-positive">
                Active CRM policy
              </span>
            </div>

            {/* Symmetrical 2-Column Profile Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Left Column: Vehicle & Policy Profile */}
              <div className="rounded-tile border border-divider bg-surface-muted/40 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-divider/60 pb-2.5">
                  <span className="text-xs font-medium text-ink-muted">
                    Vehicle profile
                  </span>
                  <div className="inline-flex items-center gap-1.5 rounded-[4px] border border-divider bg-white px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-ink shadow-2xs">
                    <span className="bg-accent-soft px-1 rounded text-[9px] font-bold text-ink">IND</span>
                    <span>{lookup.vehicle}</span>
                    <span className="text-[10px] text-ink-muted">({lookup.typ || vehicleGroup})</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <span className="block text-[10.5px] text-ink-muted">Make</span>
                    <span className="font-semibold text-ink">{lookup.make || "Not recorded"}</span>
                  </div>
                  <div>
                    <span className="block text-[10.5px] text-ink-muted">Model</span>
                    <span className="font-semibold text-ink">{lookup.model || "Not recorded"}</span>
                  </div>
                  <div>
                    <span className="block text-[10.5px] text-ink-muted">Existing policy no.</span>
                    <span className="font-semibold text-ink tabular-nums">{lookup.policyNumber || "Not recorded"}</span>
                  </div>
                  <div>
                    <span className="block text-[10.5px] text-ink-muted">Previous insurer</span>
                    <span className="font-semibold text-ink">{lookup.insurer || "Not recorded"}</span>
                  </div>
                </div>

                <div className="border-t border-divider/60 pt-2 flex items-center justify-between text-xs">
                  <span className="text-ink-muted">Current policy due date</span>
                  <span className="font-bold text-ink tabular-nums">
                    {lookup.dueDate ? formatDate(lookup.dueDate) : "Not recorded"}
                  </span>
                </div>
              </div>

              {/* Right Column: Customer & Valuation (IDV) Profile */}
              <div className="rounded-tile border border-divider bg-surface-muted/40 p-4 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-divider/60 pb-2.5">
                    <span className="text-xs font-medium text-ink-muted">
                      Customer and valuation
                    </span>
                    {lookup.idv !== null && lookup.idv > 0 ? (
                      <Chip tone="positive">IDV Recorded</Chip>
                    ) : (
                      <Chip tone="warning">IDV Required</Chip>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-2 text-xs">
                    <div>
                      <span className="block text-[10.5px] text-ink-muted">Owner name</span>
                      <span className="font-semibold text-ink">{lookup.customer || "Not recorded"}</span>
                    </div>
                    <div>
                      <span className="block text-[10.5px] text-ink-muted">Contact</span>
                      <span className="font-semibold text-ink tabular-nums">{lookup.contact || "Not recorded"}</span>
                    </div>
                  </div>
                </div>

                {/* IDV Status Banner */}
                <div
                  className={cn(
                    "rounded-tile border p-3 text-xs transition-colors",
                    lookup.idv !== null && lookup.idv > 0
                      ? "border-positive/30 bg-positive-soft/30 text-ink"
                      : "border-warning/40 bg-warning-soft/40 text-ink",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[11px] text-ink-muted">Recorded IDV</span>
                    <span className="font-bold text-sm text-ink tabular-nums">
                      {lookup.idv !== null && lookup.idv > 0 ? formatINR(lookup.idv) : "Not recorded"}
                    </span>
                  </div>
                  {(!lookup.idv || lookup.idv === 0) && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-warning leading-snug">
                      <AlertCircle size={13} className="shrink-0 text-warning" />
                      <span>
                        <strong>Required:</strong> Enter the renewed IDV in step 2 below so the customer&apos;s mobile app shows full policy valuation.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-ink-muted">
              On approval, the policy will update with the new policy details below while preserving the previous due date in Renewal History.
            </p>
          </div>
        )}

        {/* State D: Unknown Vehicle (Requires Personal, Vehicle & Policy/Payment details for admin approval) */}
        {unknown && lookup?.ok && lookup.state === "unknown" && (
          <div className="reveal-down space-y-5">
            <div className="flex items-start gap-3 rounded-tile bg-warning-soft p-4 text-warning">
              <TriangleAlert size={20} strokeWidth={2} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold">Vehicle Not Found — Approval Required</p>
                <p className="mt-0.5 text-xs text-warning/90">
                  Vehicle <b>{lookup.vehicle}</b> is not in current CRM records. Complete Personal Details, Vehicle Details, and Policy &amp; Payment Details below to submit for approval.
                </p>
              </div>
            </div>

            {/* Section 1: Personal Details */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-ink-muted border-b border-divider pb-1.5">
                Personal details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-ink-muted">
                    Owner name <span className="text-negative">*</span>
                  </span>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      if (errors.customerName) setErrors((prev) => ({ ...prev, customerName: "" }));
                    }}
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
                    Contact <span className="text-negative">*</span>
                  </span>
                  <div
                    className={cn(
                      "flex h-10 min-w-0 items-center overflow-hidden rounded-control border bg-white/80 transition-colors",
                      errors.customerMobile
                        ? "border-negative focus-within:border-negative"
                        : "border-divider focus-within:border-accent-strong",
                    )}
                  >
                    <span className="flex h-full shrink-0 items-center border-r border-divider bg-surface-muted/45 px-2.5 text-xs font-medium text-ink-muted select-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={customerMobile}
                      onChange={(e) => {
                        setCustomerMobile(e.target.value.replace(/\D/g, "").slice(0, 10));
                        if (errors.customerMobile) setErrors((prev) => ({ ...prev, customerMobile: "" }));
                      }}
                      placeholder="9876543210"
                      maxLength={10}
                      className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm tabular-nums text-ink outline-none placeholder:text-ink-faint"
                    />
                  </div>
                  {errors.customerMobile && (
                    <span className="text-xs text-negative">{errors.customerMobile}</span>
                  )}
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-ink-muted">
                    Customer PIN Code <span className="font-normal text-ink-faint">(6 digits)</span>
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={customerPincode}
                    onChange={(e) => {
                      setCustomerPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
                      if (errors.customerPincode) setErrors((prev) => ({ ...prev, customerPincode: "" }));
                    }}
                    placeholder="e.g. 380001"
                    className={cn(CONTROL, "h-10 tabular-nums", errors.customerPincode && "border-negative")}
                  />
                  {errors.customerPincode && (
                    <span className="text-xs text-negative">{errors.customerPincode}</span>
                  )}
                </label>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-ink-muted">
                    Customer State <span className="font-normal text-ink-faint">(Fallback)</span>
                  </span>
                  <CustomSelect
                    value={customerState}
                    onChange={(val) => setCustomerState(val)}
                    options={PORTAL_STATE_OPTIONS}
                    searchable
                    className="h-10 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Vehicle Details (Categorized Catalog Dropdowns) */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-divider pb-1.5">
                <h3 className="text-xs font-semibold text-ink-muted">
                  Vehicle details
                </h3>
                <span className="text-[11px] text-ink-faint">
                  Standardized catalog selection for data uniformity
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-start">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-ink-muted">Reg. number</span>
                  <div className="flex h-10 items-center rounded-control border border-divider bg-surface-muted/60 px-3 text-sm font-bold uppercase tracking-wider tabular-nums text-ink">
                    {lookup.vehicle}
                  </div>
                </div>

                {/* Visual Vehicle Type Selection */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-ink-muted">
                    Type <span className="text-negative">*</span>
                  </span>
                  <div className="flex h-10 items-center gap-1 rounded-control border border-divider bg-surface-muted/35 p-1">
                    {[
                      { value: "2W", label: "2W", icon: Bike, hint: "Two Wheeler" },
                      { value: "4W", label: "4W", icon: Car, hint: "Four Wheeler" },
                      { value: "CW", label: "CW", icon: Truck, hint: "Commercial" },
                    ].map(({ value, label, icon: Icon, hint }) => {
                      const isSel = vehicleGroup === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          title={hint}
                          onClick={() => {
                            setVehicleGroup(value);
                            setVehicleMake("");
                            setVehicleModel("");
                            setCustomModel("");
                            if (errors.vehicleGroup) setErrors((prev) => ({ ...prev, vehicleGroup: "" }));
                          }}
                          className={cn(
                            "flex-1 h-full flex items-center justify-center gap-1 rounded-[4px] text-xs font-bold transition-all",
                            isSel
                              ? "bg-accent text-ink shadow-xs border border-accent-strong"
                              : "text-ink-muted hover:text-ink hover:bg-surface-muted/60",
                          )}
                        >
                          <Icon size={13} />
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {errors.vehicleGroup && (
                    <span className="text-xs text-negative">{errors.vehicleGroup}</span>
                  )}
                </div>

                {/* Make Dropdown */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-ink-muted">
                    Make <span className="text-negative">*</span>
                  </span>
                  <CustomSelect
                    value={vehicleMake}
                    onChange={(val) => {
                      setVehicleMake(val);
                      setVehicleModel("");
                      setCustomModel("");
                      if (errors.vehicleMake) setErrors((prev) => ({ ...prev, vehicleMake: "" }));
                    }}
                    options={makeOptions}
                    placeholder={vehicleGroup ? `Select ${vehicleGroup} Make…` : "Select Make…"}
                    searchable
                    invalid={Boolean(errors.vehicleMake)}
                    className="h-10 text-xs"
                  />
                  {errors.vehicleMake && (
                    <span className="text-xs text-negative">{errors.vehicleMake}</span>
                  )}
                </div>

                {/* Model Dropdown */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-ink-muted">
                    Model <span className="text-negative">*</span>
                  </span>
                  <CustomSelect
                    value={vehicleModel}
                    onChange={(val) => {
                      setVehicleModel(val);
                      if (errors.vehicleModel) setErrors((prev) => ({ ...prev, vehicleModel: "" }));
                    }}
                    options={modelOptions}
                    placeholder={vehicleMake ? `Select ${vehicleMake} Model…` : "Choose Make first"}
                    disabled={!vehicleMake}
                    searchable
                    invalid={Boolean(errors.vehicleModel)}
                    className="h-10 text-xs"
                  />
                  {errors.vehicleModel && (
                    <span className="text-xs text-negative">{errors.vehicleModel}</span>
                  )}
                </div>
              </div>

              {/* Custom Model Specification (when user selects Other / Custom Model) */}
              {vehicleModel === "__OTHER__" && (
                <div className="rounded-tile border border-accent-strong/40 bg-accent-soft/25 p-3.5 mt-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-ink">
                      Specify Custom Model Name <span className="text-negative">*</span>
                    </span>
                    <input
                      type="text"
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      placeholder="e.g. Special Edition / Variant Name"
                      maxLength={80}
                      className={cn(CONTROL, "h-10 bg-white")}
                    />
                    <span className="text-[11px] text-ink-muted">
                      This custom model will be recorded with this claim for admin review.
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Card 3: Policy & Payment Details (shown once vehicle is verified)  */}
      {/* ------------------------------------------------------------------ */}
      {isVehicleVerified && (
        <Card className="p-5 sm:p-6 space-y-5 reveal-down">
          <CardHeader
            title={known ? "New Policy & Payment Details" : "Payment & Policy Details"}
            action={<Chip tone="accent">Step 2 of 2</Chip>}
          />

          {/* Policy & Valuation Details Row (Symmetrical 4-Column Grid) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-muted">
                {known ? "New policy no." : "Policy number"} <span className="text-negative">*</span>
              </span>
              <input
                type="text"
                value={policyNumber}
                onChange={(e) => {
                  setPolicyNumber(e.target.value);
                  if (errors.policyNumber) setErrors((prev) => ({ ...prev, policyNumber: "" }));
                }}
                placeholder="e.g. 231100/31/2026/12345"
                maxLength={80}
                className={cn(CONTROL, "h-10 tabular-nums", errors.policyNumber && "border-negative")}
              />
              {errors.policyNumber && (
                <span className="text-xs text-negative">{errors.policyNumber}</span>
              )}
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-muted">
                {known ? "New insurer" : "Insurer"} <span className="text-negative">*</span>
              </span>
              <CustomSelect
                value={insurer}
                onChange={(val) => {
                  setInsurer(val);
                  if (errors.insurer) setErrors((prev) => ({ ...prev, insurer: "" }));
                }}
                options={insurerOptions}
                placeholder="Select insurer"
                searchable
                invalid={Boolean(errors.insurer)}
              />
              {errors.insurer && (
                <span className="text-xs text-negative">{errors.insurer}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-muted">
                {known ? "New due date" : "Due date"} <span className="text-negative">*</span>
              </span>
              <DatePicker
                value={dueDate}
                onChange={(val) => {
                  setDueDate(val);
                  if (errors.dueDate) setErrors((prev) => ({ ...prev, dueDate: "" }));
                }}
                placeholder="Select due date"
                invalid={Boolean(errors.dueDate)}
              />
              {errors.dueDate && (
                <span className="text-xs text-negative">{errors.dueDate}</span>
              )}
            </div>

            {/* Vehicle IDV (Mandatory for both existing & new vehicles) */}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-muted flex items-center justify-between">
                <span>
                  Vehicle IDV (₹) <span className="text-negative">*</span>
                </span>
                {known && (!lookup?.idv || lookup.idv === 0) && (
                  <span className="text-[10px] text-warning font-semibold">Update required</span>
                )}
              </span>
              <input
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={idv}
                onChange={(e) => {
                  setIdv(e.target.value);
                  if (errors.idv) setErrors((prev) => ({ ...prev, idv: "" }));
                }}
                placeholder="e.g. 450000"
                className={cn(CONTROL, "h-10 tabular-nums", errors.idv && "border-negative")}
              />
              {errors.idv ? (
                <span className="text-xs text-negative">{errors.idv}</span>
              ) : (
                <span className="text-[11px] text-ink-faint">Insured Declared Value (recorded for app).</span>
              )}
            </label>

            {insurer === OTHER_INSURER_VALUE && (
              <label className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-4">
                <span className="text-xs font-medium text-ink-muted">
                  New Insurer Name <span className="text-negative">*</span>
                </span>
                <input
                  type="text"
                  value={insurerCustom}
                  onChange={(e) => {
                    setInsurerCustom(e.target.value);
                    if (errors.insurerCustom) setErrors((prev) => ({ ...prev, insurerCustom: "" }));
                  }}
                  placeholder="Enter insurer company name"
                  maxLength={120}
                  className={cn(CONTROL, "h-10", errors.insurerCustom && "border-negative")}
                />
                {errors.insurerCustom && (
                  <span className="text-xs text-negative">{errors.insurerCustom}</span>
                )}
              </label>
            )}
          </div>

          {/* Payment Details Row (Symmetrical 4-Column Grid) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border-t border-divider pt-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-muted">
                {known ? "Amount (₹)" : "Premium Paid (₹)"} <span className="text-negative">*</span>
              </span>
              <input
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (errors.amount) setErrors((prev) => ({ ...prev, amount: "" }));
                }}
                placeholder="e.g. 4500"
                className={cn(CONTROL, "h-10 tabular-nums", errors.amount && "border-negative")}
              />
              {errors.amount ? (
                <span className="text-xs text-negative">{errors.amount}</span>
              ) : (
                <span className="text-[11px] text-ink-faint">Total premium / amount received.</span>
              )}
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-muted">
                Payment Date <span className="text-negative">*</span>
              </span>
              <DatePicker
                value={paymentDate}
                onChange={(val) => {
                  setPaymentDate(val);
                  if (errors.paymentDate) setErrors((prev) => ({ ...prev, paymentDate: "" }));
                }}
                maxToday
                invalid={Boolean(errors.paymentDate)}
              />
              {errors.paymentDate ? (
                <span className="text-xs text-negative">{errors.paymentDate}</span>
              ) : (
                <span className="text-[11px] text-ink-faint">Date payment was received.</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-muted">
                Payment Mode <span className="text-negative">*</span>
              </span>
              <CustomSelect
                value={paymentMode}
                onChange={(val) => {
                  setPaymentMode(val);
                  if (errors.paymentMode) setErrors((prev) => ({ ...prev, paymentMode: "" }));
                }}
                options={PAYMENT_MODES}
                placeholder="Select payment mode"
                invalid={Boolean(errors.paymentMode)}
              />
              {errors.paymentMode && (
                <span className="text-xs text-negative">{errors.paymentMode}</span>
              )}
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-muted">Transaction Remarks / UTR</span>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. UTR12345678"
                maxLength={500}
                className={cn(CONTROL, "h-10")}
              />
              <span className="text-[11px] text-ink-faint">Optional reference note or UTR.</span>
            </label>
          </div>

          {/* Customer Location for Known Vehicle (PIN & fallback State for incentive matching) */}
          {known && (
            <div className="grid gap-4 sm:grid-cols-2 border-t border-divider pt-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-ink-muted">
                  Customer PIN Code <span className="font-normal text-ink-faint">(6 digits)</span>
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={customerPincode}
                  onChange={(e) => {
                    setCustomerPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    if (errors.customerPincode) setErrors((prev) => ({ ...prev, customerPincode: "" }));
                  }}
                  placeholder="e.g. 380001"
                  className={cn(CONTROL, "h-10 tabular-nums", errors.customerPincode && "border-negative")}
                />
                {errors.customerPincode ? (
                  <span className="text-xs text-negative">{errors.customerPincode}</span>
                ) : (
                  <span className="text-[11px] text-ink-faint">
                    Used by the incentive engine to verify customer state locally.
                  </span>
                )}
              </label>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-ink-muted">
                  Customer State <span className="font-normal text-ink-faint">(Fallback)</span>
                </span>
                <CustomSelect
                  value={customerState}
                  onChange={(val) => setCustomerState(val)}
                  options={PORTAL_STATE_OPTIONS}
                  searchable
                  className="h-10 text-xs"
                />
                <span className="text-[11px] text-ink-faint">
                  Optional manual state if customer PIN is missing or not listed.
                </span>
              </div>
            </div>
          )}

          {/* Policy Document Upload (mandatory; auto-published to customer app once Admin approves) */}
          <div className="border-t border-divider pt-4 grid gap-4 sm:grid-cols-12 items-start">
            <div className="sm:col-span-8 flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-muted">
                Policy Document Upload <span className="text-negative">*</span>
              </span>

              {documentFile ? (
                <div className="flex h-11 items-center justify-between gap-2 rounded-control border border-ink/25 bg-accent-soft/35 px-3 text-xs">
                  <span className="flex min-w-0 items-center gap-2 font-medium text-ink">
                    <FileText size={15} className="shrink-0 text-ink" />
                    <span className="truncate">{documentFile.name}</span>
                    <span className="shrink-0 text-[11px] text-ink-muted tabular-nums">
                      ({(documentFile.size / 1024).toFixed(0)} KB)
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label="Remove policy document"
                    onClick={() => {
                      setDocumentFile(null);
                      if (docInputRef.current) docInputRef.current.value = "";
                    }}
                    className="grid size-7 shrink-0 place-items-center rounded-control text-ink-muted hover:bg-surface-strong hover:text-ink"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => docInputRef.current?.click()}
                  onDragEnter={(e) => {
                    if (!e.dataTransfer?.types?.includes("Files")) return;
                    e.preventDefault();
                    setIsDraggingDoc(true);
                  }}
                  onDragOver={(e) => {
                    if (!e.dataTransfer?.types?.includes("Files")) return;
                    e.preventDefault();
                  }}
                  onDragLeave={() => setIsDraggingDoc(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingDoc(false);
                    pickDocumentFile(e.dataTransfer.files?.[0] ?? null);
                  }}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-control border border-dashed px-3.5 py-2.5 text-xs transition-colors",
                    errors.document
                      ? "border-negative bg-negative-soft/30"
                      : isDraggingDoc
                        ? "border-accent-strong bg-accent-soft/45"
                        : "border-divider bg-surface-muted/30 hover:border-ink/50 hover:bg-surface-muted/50",
                  )}
                >
                  <UploadCloud size={18} className="shrink-0 text-ink-muted" />
                  <div className="min-w-0">
                    <span className="block font-medium text-ink">
                      Click or drop policy PDF / image here
                    </span>
                    <span className="block text-[11px] text-ink-faint">
                      Required · PDF, JPG, PNG or WebP · max {MAX_UPLOAD_LABEL}. Shows in customer app once Admin approves.
                    </span>
                  </div>
                </div>
              )}

              <input
                ref={docInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => pickDocumentFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              {errors.document && (
                <span className="text-xs font-medium text-negative">{errors.document}</span>
              )}
            </div>

            <div className="sm:col-span-4 flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-muted">Document Type</span>
              <CustomSelect
                value={documentType}
                onChange={(val) => setDocumentType(val || "Policy copy")}
                options={DOCUMENT_TYPE_OPTIONS}
                className="h-11 text-xs"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Global Form Errors */}
      {errors.form && (
        <div
          key={formErrorPulse}
          role="alert"
          className="micro-shake flex items-center gap-2 rounded-control bg-negative-soft p-3 text-xs text-negative"
        >
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
