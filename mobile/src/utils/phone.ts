/** Accepts 07X…, +94…, 94… or 7X… and returns true for a valid Sri Lankan mobile number. */
export function isValidSlMobile(input: string): boolean {
  const digits = input.replace(/[\s\-()]/g, '').replace(/^\+/, '');
  let national: string;
  if (/^94\d{9}$/.test(digits)) national = digits.slice(2);
  else if (/^0\d{9}$/.test(digits)) national = digits.slice(1);
  else if (/^\d{9}$/.test(digits)) national = digits;
  else return false;
  return /^7\d{8}$/.test(national);
}
