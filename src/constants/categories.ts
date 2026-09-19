export const DEFAULT_CATEGORIES = [
  { name: 'Vehicle', icon: 'car-front', color: '#4F6BED' },
  { name: 'Document', icon: 'file-text', color: '#7C5CFC' },
  { name: 'Food', icon: 'apple', color: '#4F8A63' },
  { name: 'Subscription', icon: 'refresh-cw', color: '#2E90A7' },
  { name: 'Warranty', icon: 'shield-check', color: '#D99132' },
  { name: 'Medicine', icon: 'pill', color: '#D85C74' },
  { name: 'Product', icon: 'package', color: '#8A6A4F' },
  { name: 'Other', icon: 'circle-ellipsis', color: '#737373' },
] as const;

export type DefaultCategoryName = (typeof DEFAULT_CATEGORIES)[number]['name'];

type StoredCategoryVisual = {
  color: string | null;
  icon: string | null;
  id: number;
  name: string;
};

export function buildDefaultCategoryRepairs(existingCategories: StoredCategoryVisual[]) {
  const defaultsByName = new Map(DEFAULT_CATEGORIES.map((category) => [category.name, category]));

  return existingCategories.flatMap((category) => {
    const defaults = defaultsByName.get(category.name as DefaultCategoryName);
    if (!defaults || (category.icon && category.color)) return [];

    return [{
      color: category.color ?? defaults.color,
      icon: category.icon ?? defaults.icon,
      id: category.id,
    }];
  });
}
