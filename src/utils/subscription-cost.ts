export const COST_CURRENCIES = ['MYR', 'USD', 'SGD', 'EUR', 'GBP', 'AUD', 'CAD'] as const;
export const MAX_COST_MINOR = 999999999;
export function validateCost(costMinor?: number | null, costCurrency?: string | null) {
  if (costMinor == null && costCurrency == null) return { costMinor: null, costCurrency: null };
  if (!Number.isSafeInteger(costMinor) || costMinor! < 0 || costMinor! > MAX_COST_MINOR || !COST_CURRENCIES.some(code => code === costCurrency)) {
    throw new Error('Enter a valid cost and supported currency.');
  }
  return { costMinor: costMinor!, costCurrency: costCurrency! };
}
export function parseCostAmount(value: string): number | null {
  const amount = value.trim();
  if (!amount) return null;
  if (!/^\d{1,7}([.,]\d{1,2})?$/.test(amount)) throw new Error('Enter an amount up to 9,999,999.99 with at most two decimal places.');
  const [whole, fraction = ''] = amount.replace(',', '.').split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
export function costInput(minor?: number | null) { return minor == null ? '' : (minor / 100).toFixed(2); }
export function formatCost(minor: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, currencyDisplay: 'code' }).format(minor / 100);
}
type CostItem = { costMinor: number | null; costCurrency: string | null; repeatType: string; repeatInterval: number; archived: boolean };
export function recurringCosts(items: CostItem[]) {
  const totals = new Map<string, { yearly: number; count: number }>();
  for (const item of items) {
    if (item.archived || item.costMinor == null || !item.costCurrency) continue;
    const occurrences = item.repeatType === 'monthly' ? 12 : item.repeatType === 'yearly' ? 1 : item.repeatType === 'weekly' ? 365 / 7 : item.repeatType === 'daily' ? 365 : item.repeatType === 'custom' && item.repeatInterval >= 1 ? 365 / item.repeatInterval : 0;
    if (!occurrences) continue;
    const total = totals.get(item.costCurrency) ?? { yearly: 0, count: 0 };
    total.yearly += item.costMinor * occurrences;
    total.count++;
    totals.set(item.costCurrency, total);
  }
  return [...totals].sort(([a], [b]) => a.localeCompare(b)).map(([currency, total]) => ({ currency, count: total.count, yearly: Math.round(total.yearly), monthly: Math.round(total.yearly / 12) }));
}
