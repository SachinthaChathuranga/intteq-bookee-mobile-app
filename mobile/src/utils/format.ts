/** Formats a numeric amount into LKR currency representation according to SPEC §2.4 (Rs. 500). */
export function formatCurrency(amount: number): string {
  const rounded = Math.round(amount);
  return `Rs. ${rounded.toLocaleString('en-US')}`;
}
