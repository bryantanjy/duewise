type VisibleField = {
  currentOffset: number;
  fieldTop: number;
  fieldHeight: number;
  viewportTop: number;
  viewportHeight: number;
  gap?: number;
};

export function scrollOffsetToShowField({
  currentOffset,
  fieldTop,
  fieldHeight,
  viewportTop,
  viewportHeight,
  gap = 16,
}: VisibleField): number {
  const visibleTop = viewportTop + gap;
  const visibleBottom = viewportTop + viewportHeight - gap;
  const fieldBottom = fieldTop + fieldHeight;

  if (fieldTop < visibleTop) {
    return Math.max(0, currentOffset - (visibleTop - fieldTop));
  }

  if (fieldBottom > visibleBottom) {
    return Math.max(0, currentOffset + fieldBottom - visibleBottom);
  }

  return currentOffset;
}
