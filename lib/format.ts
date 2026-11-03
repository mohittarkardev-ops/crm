const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const num = new Intl.NumberFormat("en-IN");

/** ₹1,17,500 */
export function formatINR(value: number) {
  return inr.format(value);
}

/** 1,24,800 */
export function formatNumber(value: number) {
  return num.format(value);
}

/** Accepts "2026-11-13" and returns "13 Nov 2026" (UTC, so server and client always match). */
export function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
