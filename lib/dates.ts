/* Date helpers shared by the calendar, the date picker and the date filters. All dates are YYYY-MM-DD strings. */

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const MONTHS_SHORT = MONTHS.map((month) => month.slice(0, 3));

const DAY_MS = 86_400_000;

export function pad2(value: number) {
  return String(value).padStart(2, "0");
}

/** month is 1 to 12. */
export function toISO(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function parseISO(iso: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

export function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 0 = Monday ... 6 = Sunday. */
export function mondayIndex(year: number, month: number, day: number) {
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

export function shiftMonth(year: number, month: number, delta: number) {
  const index = year * 12 + (month - 1) + delta;
  return { y: Math.floor(index / 12), m: (index % 12) + 1 };
}

/** Today in India as YYYY-MM-DD (the database also works in IST). */
export function todayIST() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export function addDays(iso: string, days: number) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}
