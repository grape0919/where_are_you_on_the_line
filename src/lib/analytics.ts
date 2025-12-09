export function countsByDate(dates: string[], rangeDays = 7): { date: string; count: number }[] {
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const map = new Map<string, number>();
  const today = new Date();
  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    map.set(fmt(d), 0);
  }
  for (const ds of dates) {
    if (map.has(ds)) {
      map.set(ds, (map.get(ds) || 0) + 1);
    }
  }
  return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
}

