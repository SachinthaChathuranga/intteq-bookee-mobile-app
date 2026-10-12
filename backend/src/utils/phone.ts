/**
 * Normalise Sri Lankan phone input (07X…, +94…, 94…, 7X…) to 94XXXXXXXXX.
 * Returns null if the input is not a valid mobile number.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s\-()]/g, '').replace(/^\+/, '');
  let national: string;
  if (/^94\d{9}$/.test(digits)) national = digits.slice(2);
  else if (/^0\d{9}$/.test(digits)) national = digits.slice(1);
  else if (/^\d{9}$/.test(digits)) national = digits;
  else return null;
  if (!/^7\d{8}$/.test(national)) return null;
  return `94${national}`;
}
