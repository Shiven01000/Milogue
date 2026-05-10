export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISODate(d);
}

export function dateRangeISO(startDaysAgo: number, endDaysAgo = 0): string[] {
  const dates: string[] = [];
  for (let i = startDaysAgo; i >= endDaysAgo; i--) {
    dates.push(daysAgo(i));
  }
  return dates;
}

export function formatDisplayDate(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function calculateStreak(sessionDates: string[]): number {
  if (sessionDates.length === 0) return 0;
  const sorted = [...sessionDates].sort().reverse();
  let streak = 0;
  let cursor = todayISO();
  for (const date of sorted) {
    if (date === cursor) {
      streak++;
      const d = new Date(cursor + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      cursor = toISODate(d);
    } else {
      break;
    }
  }
  return streak;
}

export function groupByWeek(dates: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const date of dates) {
    const d = new Date(date + 'T00:00:00');
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = toISODate(new Date(d.setDate(diff)));
    if (!groups[weekStart]) groups[weekStart] = [];
    groups[weekStart].push(date);
  }
  return groups;
}
