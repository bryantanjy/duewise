import { useState } from 'react';
import { Keyboard, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Search from 'lucide-react-native/icons/search';
import X from 'lucide-react-native/icons/x';
import Check from 'lucide-react-native/icons/check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import SlidersHorizontal from 'lucide-react-native/icons/sliders-horizontal';
import { useTheme } from '@/hooks/use-theme';
import { DEFAULT_ITEM_FILTERS, SORT_OPTIONS, STATUS_FILTERS, type ItemListFilters } from '@/utils/item-list';

export type FilterCategory = { id: number; name: string; count: number };
type Props = {
  filters: ItemListFilters; onChange: (value: ItemListFilters) => void; resultCount: number;
  totalCount: number; categories: FilterCategory[]; isLoading?: boolean;
};
export default function ItemListControls({ filters, onChange, resultCount, totalCount, categories, isLoading }: Props) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState<'filters' | 'sort'>();
  const selectedCategory = categories.find((category) => category.id === filters.category);
  const activeFilters = [
    filters.category !== 'all' ? { key: 'category' as const, label: selectedCategory?.name ?? 'Category' } : undefined,
    filters.status !== 'all' ? { key: 'status' as const, label: STATUS_FILTERS.find((option) => option.value === filters.status)?.label ?? 'Date' } : undefined,
    filters.priority !== 'all' ? { key: 'priority' as const, label: `${filters.priority.charAt(0).toUpperCase()}${filters.priority.slice(1)} priority` } : undefined,
    filters.repeat !== 'all' ? { key: 'repeat' as const, label: filters.repeat === 'none' ? 'One-time' : 'Repeating' } : undefined,
  ].filter((value) => value !== undefined);
  const sortLabel = SORT_OPTIONS.find((option) => option.value === filters.sort)?.label;
  const countLabel = resultCount === totalCount ? `${totalCount} ${totalCount === 1 ? 'reminder' : 'reminders'}` : `${resultCount} of ${totalCount} reminders`;
  const openSheet = (next: 'filters' | 'sort') => { Keyboard.dismiss(); setSheet(next); };

  return <View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ flex: 1, minWidth: 0, minHeight: 50, flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingLeft: 14 }}>
        <Search size={17} color={colors.textSecondary} strokeWidth={1.7} />
        <TextInput accessibilityLabel="Search items by name, category, or notes" placeholder="Search reminders"
          placeholderTextColor={colors.textSecondary} value={filters.query} autoCapitalize="none" autoCorrect={false} returnKeyType="search"
          onChangeText={(query) => onChange({ ...filters, query })}
          style={{ flex: 1, minWidth: 0, minHeight: 50, paddingHorizontal: 10, paddingVertical: 12, fontSize: 14, lineHeight: 22, color: colors.text }} />
        {filters.query ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => onChange({ ...filters, query: '' })}
          style={{ minHeight: 48, width: 42, justifyContent: 'center', alignItems: 'center' }}><X size={16} color={colors.textSecondary} /></Pressable> : null}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Filters${activeFilters.length ? `, ${activeFilters.length} active` : ''}`}
        accessibilityState={{ expanded: sheet === 'filters' }} onPress={() => openSheet('filters')}
        style={({ pressed }) => ({ minHeight: 50, minWidth: 50, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
          borderRadius: 14, borderWidth: 1, borderColor: activeFilters.length ? colors.borderHighlight : colors.border,
          backgroundColor: activeFilters.length ? colors.primarySoft : colors.surface, opacity: pressed ? 0.65 : 1 })}>
        <SlidersHorizontal size={18} color={activeFilters.length ? colors.primary : colors.textSecondary} strokeWidth={1.7} />
        {activeFilters.length ? <Text style={{ fontSize: 12, fontWeight: '500', color: colors.primary }}>{activeFilters.length}</Text> : null}
      </Pressable>
    </View>

    {activeFilters.length ? <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {activeFilters.map((filter) => <Pressable key={filter.key} accessibilityRole="button" accessibilityLabel={`Remove ${filter.label} filter`}
        onPress={() => onChange({ ...filters, [filter.key]: 'all' })}
        style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: colors.primarySoft, opacity: pressed ? 0.65 : 1 })}>
        <Text style={{ fontSize: 12, lineHeight: 19, color: colors.primary }}>{filter.label}</Text><X size={13} color={colors.primary} />
      </Pressable>)}
    </View> : null}

    <View style={{ marginTop: 2, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 12 }}>
      <Text accessibilityLiveRegion="polite" style={{ fontSize: 12, lineHeight: 19, color: colors.textSecondary }}>{isLoading ? 'Loading reminders...' : countLabel}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Sort reminders, ${sortLabel}`} accessibilityState={{ expanded: sheet === 'sort' }}
        onPress={() => openSheet('sort')} style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', gap: 5, alignItems: 'center', opacity: pressed ? 0.6 : 1 })}>
        <Text style={{ fontSize: 12, lineHeight: 19, color: colors.primary }}>{sortLabel}</Text><ChevronDown size={14} color={colors.primary} />
      </Pressable>
    </View>

    <Modal visible={Boolean(sheet)} transparent animationType="slide" onRequestClose={() => setSheet(undefined)}>
      <View style={{ flex: 1, justifyContent: 'flex-end', paddingTop: insets.top + 20 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close filters and sorting" onPress={() => setSheet(undefined)}
          style={{ position: 'absolute', inset: 0, backgroundColor: colors.shadow, opacity: 0.65 }} />
        <View accessibilityViewIsModal style={{ maxHeight: '100%', backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Math.max(insets.bottom, 16) }}>
          <View style={{ paddingLeft: 22, paddingRight: 12, paddingTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text accessibilityRole="header" style={{ fontSize: 19, lineHeight: 27, fontWeight: '600', color: colors.text }}>{sheet === 'sort' ? 'Sort reminders' : 'Filter reminders'}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close filters and sorting" onPress={() => setSheet(undefined)}
              style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><X size={21} color={colors.textSecondary} /></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 20 }}>
            {sheet === 'sort' ? <View style={{ marginTop: 8 }}>
              {SORT_OPTIONS.map((option) => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ selected: filters.sort === option.value }}
                onPress={() => { onChange({ ...filters, sort: option.value }); setSheet(undefined); }}
                style={({ pressed }) => ({ minHeight: 54, paddingHorizontal: 12, paddingVertical: 13, marginBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  borderRadius: 12, backgroundColor: filters.sort === option.value ? colors.primarySoft : pressed ? colors.surfaceInset : colors.surface })}>
                <Text style={{ flex: 1, fontSize: 14, lineHeight: 21, color: filters.sort === option.value ? colors.primary : colors.text }}>{option.label}</Text>
                {filters.sort === option.value ? <Check size={17} color={colors.primary} /> : null}
              </Pressable>)}
            </View> : <View>
              <Choices title="Date" value={filters.status} options={STATUS_FILTERS.map((option) => ({ ...option, label: option.value === 'all' ? 'Any date' : option.label }))}
                onSelect={(status) => onChange({ ...filters, status })} />
              <Choices<number | 'all'> title="Category" value={filters.category} options={[
                { value: 'all', label: 'All categories' }, ...categories.map((category) => ({ value: category.id, label: `${category.name} (${category.count})` })),
              ]} onSelect={(category) => onChange({ ...filters, category })} />
              <Choices title="Priority" value={filters.priority} options={[
                { value: 'all', label: 'Any priority' }, { value: 'low', label: 'Low' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' },
              ]} onSelect={(priority) => onChange({ ...filters, priority })} />
              <Choices title="Repeat" value={filters.repeat} options={[
                { value: 'all', label: 'Any repeat' }, { value: 'repeating', label: 'Repeating' }, { value: 'none', label: 'One-time' },
              ]} onSelect={(repeat) => onChange({ ...filters, repeat })} />
            </View>}
          </ScrollView>
          {sheet === 'filters' ? <View style={{ paddingHorizontal: 22, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Pressable accessibilityRole="button" onPress={() => setSheet(undefined)} style={({ pressed }) => ({ minHeight: 52, padding: 13, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryFill, opacity: pressed ? 0.85 : 1 })}>
              <Text style={{ fontSize: 15, lineHeight: 23, fontWeight: '600', color: colors.onPrimary }}>Show {resultCount} {resultCount === 1 ? 'reminder' : 'reminders'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => onChange({ ...DEFAULT_ITEM_FILTERS })} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 13, color: colors.primary }}>Reset search & filters</Text>
            </Pressable>
          </View> : null}
        </View>
      </View>
    </Modal>
  </View>;
}

function Choices<T extends string | number>({ title, value, options, onSelect }: {
  title: string; value: T; options: readonly { value: T; label: string }[]; onSelect: (value: T) => void;
}) {
  const colors = useTheme();
  return <View style={{ marginTop: 18 }}>
    <Text accessibilityRole="header" style={{ marginBottom: 8, fontSize: 13, lineHeight: 20, fontWeight: '500', color: colors.textSecondary }}>{title}</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel={title} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((option) => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ selected: value === option.value }}
        onPress={() => onSelect(option.value)} style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center', borderRadius: 12, borderWidth: 1,
          borderColor: value === option.value ? colors.primary : colors.border,
          backgroundColor: value === option.value ? colors.primarySoft : pressed ? colors.surfaceInset : colors.surface })}>
        <Text style={{ fontSize: 13, lineHeight: 20, color: value === option.value ? colors.primary : colors.text }}>{option.label}</Text>
      </Pressable>)}
    </View>
  </View>;
}
