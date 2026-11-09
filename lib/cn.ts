import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Joins class names and resolves Tailwind conflicts, so a later `h-8 px-3 text-xs` really replaces an earlier
 * `h-10 px-4 text-sm`. (Plain clsx left the winner to the order of the generated stylesheet.)
 * Requires the `tailwind-merge` package: run `npm install` in crm/ once.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
