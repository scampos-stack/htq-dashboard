// Zendesk gives minutes; render as e.g. "4h 12m" or "2d 3h" so it's
// readable at a glance instead of a raw minute count.
export function formatDuration(minutes: number | null): string {
  if (minutes == null) return "—";
  const totalMinutes = Math.round(minutes);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const mins = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
