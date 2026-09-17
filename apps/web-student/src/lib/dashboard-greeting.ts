/** Local-time eyebrow for the dashboard hero (browser only). */
export function dashboardTimeEyebrow(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
