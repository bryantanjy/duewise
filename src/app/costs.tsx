import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '@/db';
import { items } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { costBreakdown } from '@/utils/cost-breakdown';
import { formatCost } from '@/utils/subscription-cost';
import { formatDateForDisplay } from '@/utils/item-form';
import { repeatLabel } from '@/utils/recurrence';

const query = db.select({ id: items.id, name: items.name, targetDate: items.targetDate, costMinor: items.costMinor, costCurrency: items.costCurrency, repeatType: items.repeatType, repeatInterval: items.repeatInterval, archived: items.archived }).from(items).where(eq(items.archived, false));
export default function CostsScreen() {
  const colors = useTheme();
  const { data, error, updatedAt } = useLiveQuery(query);
  const [currency, setCurrency] = useState<string>();
  const model = useMemo(() => costBreakdown(data, currency), [data, currency]);
  const panel = { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 16 };
  const loading = !updatedAt && !error;
  return <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.homeBackground }}>
    <FlatList data={error ? [] : model.rows} keyExtractor={item => String(item.id)} showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 22, width: '100%', maxWidth: 684, alignSelf: 'center' }}
      ListHeaderComponent={<View>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingRight: 18, gap: 4 }}>
          <ChevronLeft size={20} color={colors.textSecondary} /><Text style={{ color: colors.textSecondary }}>Back</Text>
        </Pressable>
        <Text accessibilityRole="header" style={{ marginTop: 12, fontSize: 26, lineHeight: 34, fontWeight: '600', color: colors.text }}>Cost breakdown</Text>
        <Text style={{ marginTop: 10, color: colors.textSecondary, fontSize: 14, lineHeight: 22 }}>Review costs on active reminders. Tap a reminder to update its amount or schedule.</Text>
        {model.currencies.length > 1 ? <View accessibilityRole="radiogroup" accessibilityLabel="Cost currency" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
          {[undefined, ...model.currencies].map(code => <Pressable key={code ?? 'all'} accessibilityRole="radio" accessibilityState={{ checked: model.selected === code }} onPress={() => setCurrency(code)}
            style={{ ...panel, minHeight: 48, justifyContent: 'center', paddingHorizontal: 14, backgroundColor: model.selected === code ? colors.primarySoft : colors.surface }}>
            <Text style={{ color: model.selected === code ? colors.primary : colors.text }}>{code ?? 'All currencies'}</Text>
          </Pressable>)}
        </View> : null}
        {!error && model.totals.length ? <View style={{ ...panel, padding: 18, marginTop: 18 }}>
          <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>Recurring estimates</Text>
          {model.totals.map(total => <View key={total.currency} style={{ marginTop: 14 }}>
            <Text style={{ fontSize: 17, lineHeight: 25, color: colors.text }}>{formatCost(total.monthly, total.currency)} / month</Text>
            <Text style={{ lineHeight: 22, color: colors.textSecondary }}>{formatCost(total.yearly, total.currency)} / year</Text>
          </View>)}
          <Text style={{ marginTop: 12, color: colors.textSecondary, fontSize: 12, lineHeight: 19 }}>Based on repeat schedules and a 365-day year. One-time costs are excluded. Actual charges may vary; currencies are kept separate.</Text>
        </View> : null}
        {!error && model.rows.length ? <Text accessibilityRole="header" style={{ marginTop: 24, marginBottom: 12, color: colors.text, fontSize: 17, fontWeight: '600' }}>{model.rows.length} {model.rows.length === 1 ? 'reminder with a cost' : 'reminders with costs'}</Text> : null}
      </View>}
      ListEmptyComponent={<View style={{ ...panel, padding: 20, marginTop: 20 }}>
        {loading ? <ActivityIndicator color={colors.primary} /> : null}
        <Text accessibilityRole={error ? 'alert' : undefined} style={{ color: error ? colors.danger : colors.text, fontSize: 15, lineHeight: 24 }}>{error ? 'Unable to load costs. Leave this screen and try again.' : loading ? 'Loading costs...' : 'No costs added yet. Add an optional cost when creating or editing a reminder.'}</Text>
        {!loading && !error ? <Pressable accessibilityRole="button" onPress={() => router.push('/item/new')} style={{ minHeight: 48, justifyContent: 'center', marginTop: 12 }}><Text style={{ color: colors.primary }}>Add a reminder</Text></Pressable> : null}
      </View>}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}, ${formatCost(item.costMinor!, item.costCurrency!)}, due ${formatDateForDisplay(item.targetDate)}`}
        onPress={() => router.push({ pathname: '/item/[id]', params: { id: String(item.id) } })}
        style={({ pressed }) => ({ ...panel, padding: 18, marginBottom: 10, opacity: pressed ? 0.7 : 1 })}>
        <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24, fontWeight: '500' }}>{item.name}</Text>
        <Text style={{ color: colors.primary, fontSize: 17, lineHeight: 25, marginTop: 6 }}>{formatCost(item.costMinor!, item.costCurrency!)} per occurrence</Text>
        <Text style={{ color: colors.textSecondary, lineHeight: 22, marginTop: 6 }}>Due {formatDateForDisplay(item.targetDate)} / {item.repeatType === 'none' ? 'One-time' : repeatLabel(item.repeatType, item.repeatInterval)}</Text>
      </Pressable>} />
  </SafeAreaView>;
}
