import Svg, { Circle, Path, Rect } from 'react-native-svg';

/** The Duewise mark: a date-book D with a small moment-of-attention dot. */
export default function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <Svg accessibilityLabel="Duewise" height={size} viewBox="0 0 100 100" width={size}>
      <Rect fill="#3B3468" height="100" rx="27" width="100" />
      <Path
        d="M31 25V75H49C65 75 76 64 76 50C76 36 65 25 49 25H31Z"
        fill="none"
        stroke="#FFFFFF"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="8"
      />
      <Circle cx="76" cy="27" fill="#F0C78C" r="7" />
    </Svg>
  );
}
