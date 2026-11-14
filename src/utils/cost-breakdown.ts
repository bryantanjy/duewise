import { recurringCosts } from './subscription-cost';

type CostRow = { id: number; name: string; targetDate: string; costMinor: number | null; costCurrency: string | null; repeatType: string; repeatInterval: number; archived: boolean };
export function costBreakdown<T extends CostRow>(items: readonly T[], currency?: string) {
  const active = items.filter(item => !item.archived && item.costMinor != null && item.costCurrency);
  const currencies = [...new Set(active.map(item => item.costCurrency!))].sort();
  // A deleted last reminder in a currency falls back to all currencies.
  const selected = currency && currencies.includes(currency) ? currency : undefined;
  const rows = active.filter(item => !selected || item.costCurrency === selected)
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate) || a.name.localeCompare(b.name) || a.id - b.id);
  return { currencies, selected, rows, totals: recurringCosts(rows) };
}
