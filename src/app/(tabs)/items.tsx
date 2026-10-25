import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Inbox from 'lucide-react-native/icons/inbox';
import Plus from 'lucide-react-native/icons/plus';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ItemListControls from '@/components/items/ItemListControls';
import HomeReminderRow from '@/components/items/HomeReminderRow';
import { DEFAULT_ITEM_FILTERS, STATUS_FILTERS, selectItems, type ItemListFilters, type ItemListStatus } from '@/utils/item-list';
import { db } from '@/db';
import { categories, items } from '@/db/schema';
import { toDateInput } from '@/utils/dates';
import { useTheme } from '@/hooks/use-theme';

const activeItemsQuery = db
  .select({
    categoryColor: categories.color,
    categoryId: categories.id,
    categoryName: categories.name,
    id: items.id,
    importance: items.importance,
    notes: items.notes,
    createdAt: items.createdAt,
    reminderTime: items.reminderTime,
    name: items.name,
    repeatType: items.repeatType,
    repeatInterval: items.repeatInterval,
    targetDate: items.targetDate,
  })
  .from(items)
  .leftJoin(categories, eq(items.categoryId, categories.id))
  .where(eq(items.archived, false))
  .orderBy(items.targetDate);

const categoriesListQuery = db.select().from(categories).orderBy(categories.id);


export default function ItemsScreen() {
  const colors = useTheme();
  const { data: allItems, error, updatedAt } = useLiveQuery(activeItemsQuery);
  const { data: categoryList } = useLiveQuery(categoriesListQuery);

  const [filters, setFilters] = useState<ItemListFilters>({ ...DEFAULT_ITEM_FILTERS });
  const { status } = useLocalSearchParams<{ status?: string }>();
  useFocusEffect(useCallback(() => {
    if (!status || !STATUS_FILTERS.some((option) => option.value === status)) return;
    setFilters({ ...DEFAULT_ITEM_FILTERS, status: status as ItemListStatus });
    router.setParams({ status: undefined });
  }, [status]));
  const [today, setToday] = useState(() => toDateInput(new Date()));
  useFocusEffect(useCallback(() => {
    const refresh = () => setToday(toDateInput(new Date()));
    refresh();
    const timer = setInterval(refresh, 60000);
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, []));
  const filteredItems = useMemo(() => selectItems(allItems, filters, today), [allItems, filters, today]);
  const categoryMatches = useMemo(() => selectItems(allItems, { ...filters, category: 'all' }, today), [allItems, filters, today]);
  const filterCategories = categoryList.map((category) => ({ id: category.id, name: category.name,
    count: categoryMatches.filter((item) => item.categoryId === category.id).length }));
  const loading = !updatedAt && !error;
  const addItem = () => router.push('/item/new');
  const empty = error ? null : <View style={{ width: '100%', maxWidth: 640, alignSelf: 'center', borderWidth: 1,
    borderColor: colors.border, borderRadius: 16, padding: 24, backgroundColor: colors.surface }}>
    {loading ? <View style={{ alignItems: 'center', paddingVertical: 24 }}><ActivityIndicator color={colors.primary} />
      <Text style={{ fontSize: 13, lineHeight: 21, color: colors.textSecondary, marginTop: 12 }}>Loading reminders...</Text>
    </View> : <View>
      <Inbox size={24} color={colors.primary} strokeWidth={1.6} />
      <Text accessibilityRole="header" style={{ marginTop: 16, fontSize: 22, lineHeight: 30, fontWeight: '600', letterSpacing: -0.5, color: colors.text }}>{allItems.length ? 'No matching reminders' : 'Make room for what matters.'}</Text>
      <Text style={{ marginTop: 9, fontSize: 14, lineHeight: 23, color: colors.textSecondary }}>{allItems.length ? 'Try a different search or reset your filters to see your reminders again.' : 'Keep important dates together. Add your first reminder to get started.'}</Text>
      <Pressable accessibilityRole="button" onPress={allItems.length ? () => setFilters({ ...DEFAULT_ITEM_FILTERS }) : addItem}
        style={({ pressed }) => ({ marginTop: 20, minHeight: 48, alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 12,
          borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
          backgroundColor: allItems.length ? colors.primarySoft : colors.primaryFill, opacity: pressed ? 0.75 : 1 })}>
        {!allItems.length ? <Plus size={17} color={colors.onPrimary} /> : null}
        <Text style={{ fontSize: 13, lineHeight: 20, fontWeight: '500', color: allItems.length ? colors.primary : colors.onPrimary }}>{allItems.length ? 'Reset search & filters' : 'Add first reminder'}</Text>
      </Pressable>
    </View>}
  </View>;

  return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.homeBackground }}>
    <View style={{ paddingHorizontal: 22, paddingTop: 16, width: '100%', maxWidth: 684, alignSelf: 'center' }}>
      <View style={{ marginBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <Text accessibilityRole="header" style={{ flex: 1, fontSize: 26, lineHeight: 34, fontWeight: '600', letterSpacing: -0.65, color: colors.text }}>Your reminders</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Add new reminder" onPress={addItem}
          style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryFill,
            alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}>
          <Plus color={colors.onPrimary} size={21} strokeWidth={1.8} />
        </Pressable>
      </View>
      {error ? <Text accessibilityRole="alert" style={{ marginBottom: 16, padding: 14, borderRadius: 12, fontSize: 13, lineHeight: 21, color: colors.danger, backgroundColor: colors.dangerSoft }}>Unable to load reminders. Leave this screen and try again.</Text> : null}
      <ItemListControls filters={filters} onChange={setFilters} resultCount={filteredItems.length}
        totalCount={allItems.length} categories={filterCategories} isLoading={loading} />
    </View>
    <FlatList data={filteredItems} keyExtractor={(item) => String(item.id)}
      style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 28, paddingTop: 6 }}
      keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
      ListEmptyComponent={empty} initialNumToRender={10}
      renderItem={({ item, index }) => <View style={{ width: '100%', maxWidth: 640, alignSelf: 'center', overflow: 'hidden',
        borderColor: colors.border, borderLeftWidth: 1, borderRightWidth: 1, borderTopWidth: index === 0 ? 1 : 0,
        borderBottomWidth: index === filteredItems.length - 1 ? 1 : 0,
        borderTopLeftRadius: index === 0 ? 16 : 0, borderTopRightRadius: index === 0 ? 16 : 0,
        borderBottomLeftRadius: index === filteredItems.length - 1 ? 16 : 0, borderBottomRightRadius: index === filteredItems.length - 1 ? 16 : 0 }}>
        <HomeReminderRow item={item} showDivider={index > 0} onPress={() => router.push({ pathname: '/item/[id]', params: { id: String(item.id) } })} />
      </View>} />
  </SafeAreaView>;
}
