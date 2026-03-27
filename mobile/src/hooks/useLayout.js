import { useWindowDimensions } from 'react-native';

// Samsung Galaxy Fold unfolded inner screen is ~717px wide.
// Standard phones are typically 360-430px.
// Breakpoint at 500px cleanly separates folded vs unfolded.
const UNFOLDED_BREAKPOINT = 500;

/**
 * Returns layout info that updates live when the device folds/unfolds.
 *
 * Usage:
 *   const { isUnfolded, width, height } = useLayout();
 *   if (isUnfolded) { ... tablet/unfolded layout ... }
 */
export function useLayout() {
  const { width, height } = useWindowDimensions();

  return {
    isUnfolded: width >= UNFOLDED_BREAKPOINT,
    isLandscape: width > height,
    width,
    height,
  };
}
