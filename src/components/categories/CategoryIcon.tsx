import Apple from 'lucide-react-native/icons/apple';
import CarFront from 'lucide-react-native/icons/car-front';
import CircleEllipsis from 'lucide-react-native/icons/circle-ellipsis';
import FileText from 'lucide-react-native/icons/file-text';
import Package from 'lucide-react-native/icons/package';
import Pill from 'lucide-react-native/icons/pill';
import RefreshCw from 'lucide-react-native/icons/refresh-cw';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import { View } from 'react-native';

import {
  resolveCategoryVisual,
  type CategoryIconName,
} from '@/utils/category-visual';

const CATEGORY_ICONS = {
  apple: Apple,
  'car-front': CarFront,
  'circle-ellipsis': CircleEllipsis,
  'file-text': FileText,
  package: Package,
  pill: Pill,
  'refresh-cw': RefreshCw,
  'shield-check': ShieldCheck,
} satisfies Record<CategoryIconName, typeof Apple>;

type CategoryIconProps = {
  color: string | null;
  icon: string | null;
};

export default function CategoryIcon({ color, icon }: CategoryIconProps) {
  const visual = resolveCategoryVisual(icon, color);
  const Icon = CATEGORY_ICONS[visual.icon];

  return (
    <View
      className="h-9 w-9 items-center justify-center rounded-xl"
      style={{ backgroundColor: `${visual.color}18` }}>
      <Icon color={visual.color} size={19} strokeWidth={2.2} />
    </View>
  );
}
