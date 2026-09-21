import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import ListFilter from 'lucide-react-native/icons/list-filter';
import Inbox from 'lucide-react-native/icons/inbox';
import Plus from 'lucide-react-native/icons/plus';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import ItemRow from '@/components/items/ItemRow';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { db } from '@/db';
import { categories, items } from '@/db/schema';
import { daysUntil } from '@/utils/dates';
import { useTheme } from '@/hooks/use-theme';

const activeItemsQuery = db
  .select({
    categoryColor: categories.color,
    categoryId: categories.id,
    categoryName: categories.name,
    id: items.id,
    importance: items.importance,
    name: items.name,
    repeatType: items.repeatType,
    targetDate: items.targetDate,
  })
  .from(items)
  .leftJoin(categories, eq(items.categoryId, categories.id))
  .where(eq(items.archived, false))
  .orderBy(items.targetDate);

const categoriesListQuery = db.select().from(categories).orderBy(categories.id);

type UrgencyFilter = 'all' | 'upcoming' | 'overdue';

export default function ItemsScreen() {
  const colors = useTheme();
  const { data: allItems, error } = useLiveQuery(activeItemsQuery);
  const { data: categoryList } = useLiveQuery(categoriesListQuery);

  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>('all');

  // Filter items
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      // Category match
      if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) {
        return false;
      }
      // Urgency match
      const days = daysUntil(item.targetDate);
      if (urgencyFilter === 'overdue') return days < 0;
      if (urgencyFilter === 'upcoming') return days >= 0;
      return true;
    });
  }, [allItems, selectedCategory, urgencyFilter]);

  const overdueTotal = useMemo(
    () => allItems.filter((item) => daysUntil(item.targetDate) < 0).length,
    [allItems],
  );

  const handleCategorySelect = (catId: number | 'all') => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedCategory(catId);
  };

  const handleUrgencySelect = (filter: UrgencyFilter) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setUrgencyFilter(filter);
  };

  const handleAddPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push('/item/new');
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerClassName="px-5 pb-28 pt-4"
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-end justify-between">
          <View>
            <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-app-primary">
              Your horizon
            </Text>
            <Text className="mt-0.5 text-3xl font-extrabold tracking-tight text-app-text">
              All items
            </Text>
          </View>
          <View
            className="rounded-full px-3 py-1"
            style={{ backgroundColor: colors.primarySoft }}>
            <Text className="text-xs font-bold text-app-primary" style={{ fontVariant: ['tabular-nums'] }}>
              {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
            </Text>
          </View>
        </View>

        {error ? (
          <Text selectable className="mt-6 rounded-2xl bg-app-danger-soft p-4 text-app-danger">
            {error.message}
          </Text>
        ) : null}

        {/* Urgency Filter Pills */}
        <View className="mt-6 flex-row gap-2">
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'upcoming', label: 'Upcoming' },
              {
                key: 'overdue',
                label: overdueTotal > 0 ? `Overdue (${overdueTotal})` : 'Overdue',
              },
            ] as const
          ).map(({ key, label }) => {
            const isSelected = urgencyFilter === key;
            const isOverdueTab = key === 'overdue' && overdueTotal > 0;
            return (
              <Pressable
                accessibilityRole="button"
                className="rounded-full px-3.5 py-1.5 active:opacity-80"
                key={key}
                onPress={() => handleUrgencySelect(key)}
                style={{
                  backgroundColor: isSelected
                    ? isOverdueTab
                      ? colors.danger
                      : colors.primaryFill
                    : isOverdueTab
                      ? colors.dangerSoft
                      : colors.surface,
                  borderWidth: 1,
                  borderColor: isSelected
                    ? 'transparent'
                    : isOverdueTab
                      ? colors.dangerSoft
                      : colors.border,
                }}>
                <Text
                  className="text-xs font-bold"
                  style={{
                    color: isSelected
                      ? '#FFFFFF'
                      : isOverdueTab
                        ? colors.danger
                        : colors.textSecondary,
                  }}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Category Horizontal Filter Carousel */}
        {categoryList.length > 0 && (
          <ScrollView
            className="-mx-5 mt-3.5 px-5"
            horizontal
            showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2 py-1">
              <Pressable
                accessibilityRole="button"
                className="flex-row items-center rounded-2xl px-3.5 py-2 active:opacity-80"
                onPress={() => handleCategorySelect('all')}
                style={{
                  backgroundColor: selectedCategory === 'all' ? colors.primarySoft : colors.surface,
                  borderWidth: 1,
                  borderColor:
                    selectedCategory === 'all' ? colors.primary : colors.border,
                }}>
                <ListFilter
                  color={selectedCategory === 'all' ? colors.primary : colors.textSecondary}
                  size={13}
                />
                <Text
                  className="ml-1.5 text-xs font-bold"
                  style={{
                    color: selectedCategory === 'all' ? colors.primary : colors.text,
                  }}>
                  All Categories
                </Text>
              </Pressable>

              {categoryList.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                const count = allItems.filter((i) => i.categoryId === cat.id).length;
                return (
                  <Pressable
                    accessibilityRole="button"
                    className="flex-row items-center rounded-2xl px-3.5 py-2 active:opacity-80"
                    key={cat.id}
                    onPress={() => handleCategorySelect(cat.id)}
                    style={{
                      backgroundColor: isSelected ? colors.primarySoft : colors.surface,
                      borderWidth: 1,
                      borderColor: isSelected ? colors.primary : colors.border,
                    }}>
                    <View
                      className="mr-2 h-2 w-2 rounded-full"
                      style={{ backgroundColor: cat.color ?? colors.primary }}
                    />

                    <Text
                      className="text-xs font-bold"
                      style={{
                        color: isSelected ? colors.primary : colors.text,
                      }}>
                      {cat.name}
                    </Text>
                    {count > 0 && (
                      <View
                        className="ml-2 rounded-full px-1.5 py-0.5"
                        style={{
                          backgroundColor: isSelected ? colors.primary : colors.surfaceInset,
                        }}>
                        <Text
                          className="text-[10px] font-bold"
                          style={{
                            color: isSelected ? '#FFFFFF' : colors.textSecondary,
                            fontVariant: ['tabular-nums'],
                          }}>
                          {count}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* Content list or empty state */}
        {filteredItems.length === 0 ? (
          <Card className="mt-8 items-center p-8 text-center">
            <View
              className="h-14 w-14 items-center justify-center rounded-3xl"
              style={{ backgroundColor: colors.primarySoft }}>
              <Inbox color={colors.primary} size={26} />
            </View>
            <Text className="mt-4 text-xl font-bold text-app-text">
              {allItems.length === 0 ? 'Nothing to remember yet' : 'No matching dates'}
            </Text>
            <Text className="mt-2 text-center text-sm leading-6 text-app-muted">
              {allItems.length === 0
                ? 'Add an expiry, renewal, warranty, or birthday to keep on your radar.'
                : 'Try adjusting your filters above to see other scheduled items.'}
            </Text>
            {allItems.length === 0 ? (
              <View className="mt-6">
                <Button
                  icon={<Plus color="#FFFFFF" size={18} />}
                  onPress={handleAddPress}
                  title="Add first item"
                />
              </View>
            ) : (
              <View className="mt-6">
                <Button
                  onPress={() => {
                    setSelectedCategory('all');
                    setUrgencyFilter('all');
                  }}
                  title="Clear filters"
                  variant="secondary"
                />
              </View>
            )}
          </Card>
        ) : (
          <Card className="mt-5 overflow-hidden p-0">
            {filteredItems.map((item, index) => (
              <ItemRow
                item={item}
                key={item.id}
                onPress={() =>
                  router.push({ pathname: '/item/[id]', params: { id: String(item.id) } })
                }
                showDivider={index > 0}
              />
            ))}
          </Card>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      {allItems.length > 0 ? (
        <Pressable
          accessibilityLabel="Add new item"
          accessibilityRole="button"
          className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full active:opacity-85"
          onPress={handleAddPress}
          style={{
            backgroundColor: colors.primaryFill,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
            elevation: 8,
          }}>
          <Plus color="#FFFFFF" size={24} strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}
