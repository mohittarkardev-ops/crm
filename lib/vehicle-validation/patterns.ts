/**
 * Offline Indian Vehicle Registration Validation Engine
 * Standard Registration Patterns & Regex Constants
 *
 * Implements standard patterns for:
 * - Standard State/UT 4-part syntax (SS DD LL NNNN)
 * - Delhi NCT vehicle-class coded RTO syntax (DL DD [CSTPERZG] LL NNNN)
 * - Single-digit RTO allocations
 * - 1 to 4 digit registration sequences
 */

export interface ParsedRegularRegistration {
  stateCode: string;
  rtoCode: string;
  series: string;
  registrationNumber: string;
  delhiVehicleClass?: string;
  isDelhiSpecialFormat?: boolean;
}

// ---------------------------------------------------------------------
// Standard Indian State Pattern: SS DD LL NNNN
// SS: 2 letters
// DD: 1 or 2 digits
// LL: 1, 2, or 3 letters (or 0 for early post-1989 runs handled via legacy)
// NNNN: 1 to 4 digits (e.g. 1, 42, 123, 1234, 0001)
// ---------------------------------------------------------------------
export const STANDARD_REGISTRATION_REGEX = /^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{1,4})$/i;

// ---------------------------------------------------------------------
// Delhi NCT Special Syntax: DL DD [C/S/T/P/E/R/Z/G/V] [LL] NNNN
// Delhi embeds vehicle category code directly in the RTO series:
// C = Car, S = Two Wheeler, T = Taxi, P = Bus, G = Goods, E = Electric, R = Auto/Rickshaw, Z = Ambulance
// e.g. DL 8C AB 1234 -> DL8CAB1234, DL 1C A 1234 -> DL1CA1234, DL 4S NA 5678 -> DL4SNA5678
// ---------------------------------------------------------------------
export const DELHI_REGISTRATION_REGEX = /^(DL)(\d{1,2})([CSTPERZGV])([A-Z]{0,2})(\d{1,4})$/i;

/**
 * Checks if the string matches a standard state-based Indian registration format.
 */
export function parseRegularRegistration(normalized: string): ParsedRegularRegistration | null {
  if (!normalized) return null;

  // 1. Try Delhi NCT special pattern first if starting with "DL"
  if (/^DL/i.test(normalized)) {
    const dlMatch = normalized.match(DELHI_REGISTRATION_REGEX);
    if (dlMatch) {
      const [, state, rtoDigits, vehicleClass, seriesLetters, regDigits] = dlMatch;
      return {
        stateCode: state.toUpperCase(),
        rtoCode: `${rtoDigits.padStart(2, "0")}${vehicleClass.toUpperCase()}`,
        series: seriesLetters.toUpperCase() || vehicleClass.toUpperCase(),
        registrationNumber: regDigits,
        delhiVehicleClass: vehicleClass.toUpperCase(),
        isDelhiSpecialFormat: true,
      };
    }
  }

  // 2. Standard State Pattern: SS DD LL NNNN
  const stdMatch = normalized.match(STANDARD_REGISTRATION_REGEX);
  if (stdMatch) {
    const [, state, rtoDigits, seriesLetters, regDigits] = stdMatch;
    return {
      stateCode: state.toUpperCase(),
      rtoCode: rtoDigits.padStart(2, "0"),
      series: seriesLetters.toUpperCase(),
      registrationNumber: regDigits,
      isDelhiSpecialFormat: false,
    };
  }

  return null;
}
