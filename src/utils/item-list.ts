export const STATUS_FILTERS = [
  { value: 'all', label: 'All' }, { value: 'today', label: 'Today' },
  { value: 'next30', label: 'Next 30 days' }, { value: 'upcoming', label: 'Upcoming' },
  { value: 'overdue', label: 'Overdue' },
] as const;
export const SORT_OPTIONS = [
  { value: 'due', label: 'Due soonest' }, { value: 'latest', label: 'Latest due date' },
  { value: 'priority', label: 'Highest priority' }, { value: 'name', label: 'Name A-Z' },
  { value: 'newest', label: 'Newest added' },
] as const;
export type ItemListStatus = typeof STATUS_FILTERS[number]['value'];
export type ItemListSort = typeof SORT_OPTIONS[number]['value'];
export type ItemListFilters = {
  query: string; category: number | 'all'; status: ItemListStatus;
  priority: 'all' | 'low' | 'normal' | 'high'; repeat: 'all' | 'repeating' | 'none'; sort: ItemListSort;
};
export const DEFAULT_ITEM_FILTERS: ItemListFilters = {
  query: '', category: 'all', status: 'all', priority: 'all', repeat: 'all', sort: 'due',
};
type ListItem = {
  id: number; categoryId: number | null; categoryName: string | null; name: string; notes: string | null;
  importance: string; repeatType: string; targetDate: string; reminderTime: string; createdAt: string;
};
function searchText(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
function dueKey(item: ListItem) { return `${item.targetDate}T${item.reminderTime}`; }
function dayNumber(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 86400000;
}
export function selectItems<T extends ListItem>(items: T[], filters: ItemListFilters, today: string): T[] {
  const terms = searchText(filters.query).trim().split(/\s+/).filter(Boolean);
  const priorityRank: Record<string, number> = { high: 0, normal: 1, low: 2 };
  const todayDay = dayNumber(today);
  return items.filter((item) => {
    if (filters.category !== 'all' && item.categoryId !== filters.category) return false;
    if (filters.priority !== 'all' && item.importance !== filters.priority) return false;
    if (filters.repeat === 'none' && item.repeatType !== 'none') return false;
    if (filters.repeat === 'repeating' && item.repeatType === 'none') return false;
    const days = dayNumber(item.targetDate) - todayDay;
    if (filters.status === 'today' && days !== 0) return false;
    if (filters.status === 'next30' && (days < 0 || days > 30)) return false;
    if (filters.status === 'upcoming' && days < 0) return false;
    if (filters.status === 'overdue' && days >= 0) return false;
    const haystack = searchText(`${item.name} ${item.categoryName ?? ''} ${item.notes ?? ''}`);
    return terms.every((term) => haystack.includes(term));
  }).sort((left, right) => {
    const dueOrder = dueKey(left).localeCompare(dueKey(right));
    const nameOrder = left.name.localeCompare(right.name, undefined, { sensitivity: 'base', numeric: true });
    const tie = dueOrder || nameOrder || left.id - right.id;
    switch (filters.sort) {
      case 'latest': return -dueOrder || nameOrder || left.id - right.id;
      case 'priority': return (priorityRank[left.importance] ?? 3) - (priorityRank[right.importance] ?? 3) || tie;
      case 'name': return nameOrder || dueOrder || left.id - right.id;
      case 'newest': return Date.parse(right.createdAt) - Date.parse(left.createdAt) || tie;
      default: return tie;
    }
  });
}
