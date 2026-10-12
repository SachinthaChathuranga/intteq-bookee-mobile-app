/** Formats a numeric amount into LKR currency representation according to SPEC §2.4 (Rs. 500). */
export function formatCurrency(amount: number): string {
  const rounded = Math.round(amount);
  return `Rs. ${rounded.toLocaleString('en-US')}`;
}

/** Formats duration minutes into human-readable format like '30 min', '1h', or '1h 30m'. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMins}m`;
}

