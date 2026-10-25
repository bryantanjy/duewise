import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Check from 'lucide-react-native/icons/check';
import X from 'lucide-react-native/icons/x';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import { useTheme } from '@/hooks/use-theme';

export function FormLabel({ children }: { children: ReactNode }) {
  const colors = useTheme();
  return <Text style={{ marginBottom: 8, fontSize: 13, lineHeight: 20, fontWeight: '500', color: colors.textSecondary }}>{children}</Text>;
}
export function FormError({ message }: { message?: string }) {
  const colors = useTheme();
  return message ? <Text accessibilityRole="alert" style={{ marginTop: 6, fontSize: 12, lineHeight: 19, color: colors.danger }}>{message}</Text> : null;
}
export function FormRow({ label, value, icon, onPress, divider, error }: {
  label: string; value: string; icon?: ReactNode; onPress: () => void; divider?: boolean; error?: boolean;
}) {
  const colors = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${value}`} onPress={onPress}
    style={({ pressed }) => ({ minHeight: 66, paddingVertical: 13, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
      borderTopWidth: divider ? 1 : 0, borderTopColor: colors.border, backgroundColor: pressed ? colors.surfaceInset : 'transparent' })}>
    {icon}<View style={{ flex: 1 }}>
      <Text style={{ fontSize: 12, lineHeight: 18, color: error ? colors.danger : colors.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: 15, lineHeight: 22, fontWeight: '500', color: colors.text, marginTop: 2 }}>{value}</Text>
    </View>
    <ChevronRight size={17} color={colors.textSecondary} strokeWidth={1.7} />
  </Pressable>;
}
export function DisclosureRow({ title, summary, expanded, onPress, divider }: {
  title: string; summary: string; expanded: boolean; onPress: () => void; divider?: boolean;
}) {
  const colors = useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={onPress}
    style={({ pressed }) => ({ minHeight: 72, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
      borderTopWidth: divider ? 1 : 0, borderTopColor: colors.border, backgroundColor: pressed ? colors.surfaceInset : 'transparent' })}>
    <View style={{ flex: 1 }}><Text style={{ fontSize: 15, lineHeight: 22, fontWeight: '500', color: colors.text }}>{title}</Text>
      <Text numberOfLines={2} style={{ marginTop: 3, fontSize: 12, lineHeight: 19, color: colors.textSecondary }}>{summary}</Text></View>
    {expanded ? <ChevronUp size={17} color={colors.textSecondary} /> : <ChevronDown size={17} color={colors.textSecondary} />}
  </Pressable>;
}
export function SelectionSheet<T extends string | number>({ title, visible, options, value, onSelect, onClose, columns }: {
  title: string; visible: boolean; options: readonly { value: T; label: string; icon?: ReactNode }[];
  value: T | undefined; onSelect: (value: T) => void; onClose: () => void; columns?: boolean;
}) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={{ flex: 1, paddingTop: insets.top + 20, justifyContent: 'flex-end' }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Close ${title.toLowerCase()}`} onPress={onClose}
        style={{ position: 'absolute', inset: 0, backgroundColor: colors.shadow, opacity: 0.65 }} />
      <View accessibilityViewIsModal style={{ maxHeight: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.surface, paddingBottom: Math.max(16, insets.bottom) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 22, paddingRight: 12, paddingTop: 10 }}>
          <Text accessibilityRole="header" style={{ fontSize: 19, lineHeight: 27, fontWeight: '600', color: colors.text }}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Close ${title.toLowerCase()}`} onPress={onClose} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><X size={21} color={colors.textSecondary} /></Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: 12 }}>
          <View accessibilityRole="radiogroup" accessibilityLabel={title} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {options.map((option) => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ selected: value === option.value }}
              onPress={() => onSelect(option.value)} style={({ pressed }) => ({ width: columns && fontScale <= 1.3 ? '48%' : '100%', minHeight: 56,
                paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1,
                borderColor: value === option.value ? colors.primary : colors.border,
                backgroundColor: value === option.value ? colors.primarySoft : pressed ? colors.surfaceInset : colors.surface })}>
              {option.icon}<Text style={{ flex: 1, fontSize: 13, lineHeight: 20, color: value === option.value ? colors.primary : colors.text }}>{option.label}</Text>
              {value === option.value ? <Check size={16} color={colors.primary} /> : null}
            </Pressable>)}
          </View>
          {!options.length ? <Text style={{ fontSize: 13, color: colors.textSecondary }}>Categories are still loading.</Text> : null}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
