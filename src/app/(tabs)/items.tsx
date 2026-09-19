import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import Plus from 'lucide-react-native/icons/plus';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ItemRow from '@/components/items/ItemRow';
import { db } from '@/db';
import { categories, items } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

const activeItemsQuery = db
  .select({
    categoryColor: categories.color,
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

export default function ItemsScreen() {
  const colors = useTheme();
  const { data, error } = useLiveQuery(activeItemsQuery);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="px-5 pb-28 pt-4">
        <View className="flex-row items-end justify-between">
          <View>
            <Text className="text-xs font-bold uppercase tracking-[2px] text-app-primary">
              Your horizon
            </Text>
            <Text className="mt-1 text-3xl font-bold tracking-tight text-app-text">All items</Text>
          </View>
          <Text className="pb-1 text-sm font-medium text-app-muted">
            {data.length} {data.length === 1 ? 'item' : 'items'}
          </Text>
        </View>

        {error ? (
          <Text selectable className="mt-6 rounded-2xl bg-app-danger-soft p-4 text-app-danger">
            {error.message}
          </Text>
        ) : null}

        {data.length === 0 ? (
          <View className="mt-10 rounded-3xl bg-app-primary-soft p-6">
            <Text className="text-2xl font-bold text-app-text">Nothing to remember yet</Text>
            <Text className="mt-2 text-sm leading-6 text-app-muted">
              Add an expiry, renewal, birthday, or any date you do not want to miss.
            </Text>
            <Pressable
              className="mt-6 self-start flex-row items-center rounded-2xl bg-app-primary px-5 py-3.5 active:opacity-80"
              onPress={() => router.push('/item/new')}>
              <Plus color="#FFFFFF" size={19} />
              <Text className="ml-2 font-semibold text-white">Add first item</Text>
            </Pressable>
          </View>
        ) : (
          <View className="mt-7 overflow-hidden rounded-2xl bg-app-surface">
            {data.map((item, index) => (
              <ItemRow
                item={item}
                key={item.id}
                onPress={() =>
                  router.push({ pathname: '/item/[id]', params: { id: String(item.id) } })
                }
                showDivider={index > 0}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {data.length > 0 ? (
        <Pressable
          accessibilityLabel="Add item"
          className="absolute bottom-5 right-5 h-14 w-14 items-center justify-center rounded-full bg-app-primary shadow-lg active:opacity-80"
          onPress={() => router.push('/item/new')}>
          <Plus color="#FFFFFF" size={24} />
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}
