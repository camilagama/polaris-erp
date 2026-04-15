export const getNextRoundedContainerWidth = (
  previousWidth: number | null,
  measuredWidth: number
) => {
  if (!Number.isFinite(measuredWidth)) {
    return null;
  }

  const roundedWidth = Math.round(measuredWidth);

  return previousWidth === roundedWidth ? null : roundedWidth;
};
