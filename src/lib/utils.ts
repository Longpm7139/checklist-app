/**
 * Utilities for string normalization and flexible matching.
 * Used for KPI attribution and duty roster matching.
 */

/**
 * Removes Vietnamese accents and normalizes strings for comparison.
 */
export const normalize = (val: any): string => {
  if (val === null || val === undefined) return '';
  
  return val.toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^\w\s]/gi, '') // Remove special characters
    .replace(/\s+/g, '') // Remove all spaces
    .normalize('NFC');
};

/**
 * Flexible matching between two values (Names or Codes).
 * Handles partial matches and number extraction.
 */
export const isMatch = (v1: any, v2: any): boolean => {
  if (!v1 || !v2) return false;
  
  const n1 = normalize(v1);
  const n2 = normalize(v2);
  
  // Direct match or inclusion
  if (n1 === n2 || n1.includes(n2) || n2.includes(n1)) return true;
  
  // Number-only match (handles "016696" vs "16696")
  const num1 = n1.replace(/\D/g, '');
  const num2 = n2.replace(/\D/g, '');
  
  if (num1 !== '' && num2 !== '' && parseInt(num1) === parseInt(num2)) return true;
  
  return false;
};

/**
 * Extreme lenient matching for Vietnamese names and codes.
 * Removes accents, spaces, and compares parts of names.
 */
export const isVeryLenientMatch = (v1: any, v2: any): boolean => {
  if (!v1 || !v2) return false;
  
  const n1 = normalize(v1);
  const n2 = normalize(v2);
  
  // Direct or Number match first (Fastest)
  if (n1 === n2 || isMatch(v1, v2)) return true;
  
  // Part matching (e.g. "Ngoc Quynh" in "Mai Ngoc Quynh")
  if (n1.length > 3 && n2.length > 3) {
    if (n1.includes(n2) || n2.includes(n1)) return true;
  }
  
  return false;
};
