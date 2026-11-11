"use server";

import { createClient } from "@/lib/supabase/server";
import { audit, authorize, dbMessage, done, fail, parseDate } from "@/lib/actions/shared";
import { normalizeSlabs, type PayoutMode, type VehicleCategory } from "@/lib/incentives";

const CATEGORIES: VehicleCategory[] = ["2W", "4W", "CV"];
const MODES: PayoutMode[] = ["flat_slab", "per_payment", "per_bundle"];

export type SaveRuleInput = {
  vehicleCategory: VehicleCategory;
  isActive: boolean;
  payoutMode: PayoutMode;
  monthlyMinPayments: number;
  dailyTarget: number;
  dailyBonusAmount: number;
  dailyForfeitAmount: number;
  workingDays: number[];
  slabs: { minPayments: number; amount: number }[];
};

export async function saveIncentiveRule(input: SaveRuleInput) {
  const auth = await authorize("incentives.manage", "Only admins can configure incentive rules.");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;

  if (!CATEGORIES.includes(input.vehicleCategory)) {
    return fail("Choose 2W, 4W or CV.");
  }
  if (!MODES.includes(input.payoutMode)) {
    return fail("Choose a valid slab payout mode.");
  }

  const minPayments = Math.floor(Number(input.monthlyMinPayments));
  const dailyTarget = Math.floor(Number(input.dailyTarget));
  const dailyBonus = Number(input.dailyBonusAmount);
  const dailyForfeit = Number(input.dailyForfeitAmount);

  if (!Number.isFinite(minPayments) || minPayments < 0 || minPayments > 10_000) {
    return fail("Monthly minimum payments must be between 0 and 10,000.");
  }
  if (!Number.isFinite(dailyTarget) || dailyTarget < 0 || dailyTarget > 500) {
    return fail("Daily target must be between 0 and 500 payments.");
  }
  if (!Number.isFinite(dailyBonus) || dailyBonus < 0 || dailyBonus > 1_000_000) {
    return fail("Per-day bonus must be 0 or greater.");
  }
  if (!Number.isFinite(dailyForfeit) || dailyForfeit < 0 || dailyForfeit > 1_000_000) {
    return fail("Daily missed-target loss must be 0 or greater.");
  }

  const workingDays = Array.from(
    new Set(input.workingDays.map(Number).filter((d) => Number.isInteger(d) && d >= 1 && d <= 7)),
  ).sort((a, b) => a - b);
  if (workingDays.length === 0) {
    return fail("Select at least one working day of the week.");
  }

  const slabs = normalizeSlabs(input.slabs);
  if (slabs.length === 0) {
    return fail("Add at least one incentive slab with minimum payments >= 1.");
  }

  const db = await createClient();
  const upsert = await db
    .from("incentive_rules")
    .upsert(
      {
        vehicle_category: input.vehicleCategory,
        is_active: Boolean(input.isActive),
        payout_mode: input.payoutMode,
        monthly_min_payments: minPayments,
        daily_target: dailyTarget,
        daily_bonus_amount: dailyBonus,
        daily_forfeit_amount: dailyForfeit,
        working_days: workingDays,
        slabs,
        updated_by: staff.id,
      },
      { onConflict: "vehicle_category" },
    );

  if (upsert.error) {
    if (upsert.error.code === "42P01" || upsert.error.message.includes("incentive_rules")) {
      return fail("Run migration 0014_claims_doc_and_incentives.sql in Supabase before saving rules.");
    }
    return fail(dbMessage(upsert.error));
  }

  await audit(db, staff.id, "incentive_rule.save", "incentive_rule", input.vehicleCategory);
  return done(`Saved ${input.vehicleCategory} incentive rules.`);
}

export async function addIncentiveHoliday(dateRaw: string, labelRaw: string) {
  const auth = await authorize("incentives.manage", "Only admins can manage holiday exclusions.");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;

  const date = parseDate(dateRaw.trim());
  if (!date) return fail("Choose a valid holiday date.");
  const label = labelRaw.trim();
  if (label.length < 2 || label.length > 80) {
    return fail("Enter a holiday label (2–80 characters).");
  }

  const db = await createClient();
  const res = await db
    .from("incentive_holidays")
    .upsert({ holiday_date: date, label, created_by: staff.id }, { onConflict: "holiday_date" });

  if (res.error) return fail(dbMessage(res.error));
  await audit(db, staff.id, "incentive_holiday.save", "incentive_holiday", date);
  return done(`Added non-working day ${label} (${date}).`);
}

export async function deleteIncentiveHoliday(holidayDate: string) {
  const auth = await authorize("incentives.manage", "Only admins can manage holiday exclusions.");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;

  const date = parseDate(holidayDate.trim());
  if (!date) return fail("Invalid date.");

  const db = await createClient();
  const res = await db.from("incentive_holidays").delete().eq("holiday_date", date);
  if (res.error) return fail(dbMessage(res.error));

  await audit(db, staff.id, "incentive_holiday.delete", "incentive_holiday", date);
  return done(`Removed holiday ${date}.`);
}
