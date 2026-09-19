export const CATEGORY_ICON_NAMES = [
  'apple',
  'car-front',
  'circle-ellipsis',
  'file-text',
  'package',
  'pill',
  'refresh-cw',
  'shield-check',
] as const;

export type CategoryIconName = (typeof CATEGORY_ICON_NAMES)[number];

const categoryIconNames = new Set<string>(CATEGORY_ICON_NAMES);
const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/i;

export function resolveCategoryVisual(icon: string | null, color: string | null) {
  return {
    color: color && HEX_COLOR_PATTERN.test(color) ? color : '#737373',
    icon: categoryIconNames.has(icon ?? '')
      ? (icon as CategoryIconName)
      : 'circle-ellipsis',
  };
}
