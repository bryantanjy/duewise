import { eq } from 'drizzle-orm';

import { buildDefaultCategoryRepairs, DEFAULT_CATEGORIES } from '@/constants/categories';

import { db } from './index';
import { categories } from './schema';

export async function seedDefaultCategories() {
  const existingCategories = await db
    .select({
      color: categories.color,
      icon: categories.icon,
      id: categories.id,
      name: categories.name,
    })
    .from(categories);
  const existingNames = new Set(existingCategories.map(({ name }) => name));
  const missingCategories = DEFAULT_CATEGORIES.filter(
    ({ name }) => !existingNames.has(name),
  ).map((category) => ({ ...category }));

  if (missingCategories.length > 0) {
    await db.insert(categories).values(missingCategories).onConflictDoNothing();
  }

  const repairs = buildDefaultCategoryRepairs(existingCategories);
  for (const repair of repairs) {
    await db
      .update(categories)
      .set({ color: repair.color, icon: repair.icon })
      .where(eq(categories.id, repair.id));
  }
}
