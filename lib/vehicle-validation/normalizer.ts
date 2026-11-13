/**
 * Offline Indian Vehicle Registration Validation Engine
 * Normalizer & Character Sanitizer
 *
 * Enforces strict Indian Motor Vehicles Act input hygiene:
 * - Upper-casing
 * - Whitespace & delimiter stripping (spaces, hyphens, dots, slashes)
 * - Prohibited character detection (@, #, $, *, emoji, unicode)
 * - Canonical output preservation
 */

export interface NormalizationResult {
  /** Canonical normalized uppercase alphanumeric string */
  normalized: string;
  /** Preserved raw input */
  original: string;
  /** True if input only contains permissible registration characters */
  isValidCharacters: boolean;
  /** Specific prohibited symbols detected in user input */
  prohibitedChars: string[];
  /** True if non-ASCII Unicode or emojis were present */
  hasUnicodeOrEmoji: boolean;
}

// Prohibited special characters commonly mistyped or pasted
const PROHIBITED_CHARS_REGEX = /[@#$*!%^&()=~`<>?;:\[\]{}|"'\\+]/g;

// Unicode / non-ASCII character detector
const NON_ASCII_REGEX = /[^\x00-\x7F]/g;

// Permitted formatting separators that can be safely collapsed
const PERMITTED_SEPARATORS_REGEX = /[\s\-_./]+/g;

/**
 * Normalizes vehicle registration input and detects prohibited characters without silently swallowing them.
 */
export function normalizeRegistrationNumber(rawInput: string): NormalizationResult {
  const original = String(rawInput ?? "");
  const trimmed = original.trim();

  // Find prohibited symbols
  const prohibitedMatches = trimmed.match(PROHIBITED_CHARS_REGEX) || [];
  const prohibitedChars = Array.from(new Set(prohibitedMatches));

  // Find non-ASCII unicode / emojis
  const unicodeMatches = trimmed.match(NON_ASCII_REGEX) || [];
  const hasUnicodeOrEmoji = unicodeMatches.length > 0;

  // Collapse permitted separators (spaces, hyphens, dots, slashes) and uppercase
  const normalized = trimmed.toUpperCase().replace(PERMITTED_SEPARATORS_REGEX, "");

  const isValidCharacters = prohibitedChars.length === 0 && !hasUnicodeOrEmoji;

  return {
    normalized,
    original,
    isValidCharacters,
    prohibitedChars,
    hasUnicodeOrEmoji,
  };
}
