import Svg, { Circle, Path, Rect } from 'react-native-svg';

/** The Duewise mark: a calm date-book D with a small moment-of-attention dot. */
export default function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <Svg accessibilityLabel="Duewise" height={size} viewBox="0 0 100 100" width={size}>
      <Rect fill="#3B3468" height="100" rx="28" width="100" />
      <Path
        d="M34 30V70H48C62 70 71 62 71 50C71 38 62 30 48 30H34Z"
        fill="none"
        stroke="#FFFFFF"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="7"
      />
      <Circle cx="73.5" cy="31.5" fill="#F0C78C" r="5.5" />
    </Svg>
  );
}
