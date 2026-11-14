import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { db } from '@/db';
import { items } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { formatCost, recurringCosts } from '@/utils/subscription-cost';

const query = db.select({ costMinor: items.costMinor, costCurrency: items.costCurrency, repeatType: items.repeatType, repeatInterval: items.repeatInterval, archived: items.archived }).from(items).where(eq(items.archived, false));
export default function SubscriptionSummary() {
  const colors = useTheme();
  const { data, error } = useLiveQuery(query);
  const totals = recurringCosts(data);
  if (error) return <Text style={{ marginTop: 16, color: colors.danger }}>Unable to load recurring costs.</Text>;

  return <View style={{ marginTop: 16, padding: 18, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
    <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>Recurring costs</Text>
    {totals.map(total => <View key={total.currency} style={{ marginTop: 14 }}>
      <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24 }}>{formatCost(total.monthly, total.currency)} / month</Text>
      <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>{formatCost(total.yearly, total.currency)} / year / {total.count} recurring {total.count === 1 ? 'reminder' : 'reminders'}</Text>
    </View>)}
    {!totals.length ? <Text style={{ marginTop: 12, color: colors.textSecondary, lineHeight: 22 }}>{data.some(item => item.costMinor != null) ? 'View your one-time costs in the breakdown below.' : 'Add a cost to your reminders to track spending here.'}</Text> : null}
    <Pressable accessibilityRole="button" onPress={() => router.push('/costs')} style={{ minHeight: 48, justifyContent: 'center', marginTop: 8 }}><Text style={{ color: colors.primary, fontWeight: '500' }}>View cost breakdown</Text></Pressable>
    <Text style={{ marginTop: 12, color: colors.textSecondary, fontSize: 12, lineHeight: 19 }}>Estimates from active repeat schedules, using a 365-day year. Actual charges may vary. Currencies are kept separate.</Text>
  </View>;
}
