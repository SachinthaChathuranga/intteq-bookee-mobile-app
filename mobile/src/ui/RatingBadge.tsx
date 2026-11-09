import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { useTheme } from '../theme/ThemeProvider';
import { radius } from './tokens';

export interface RatingBadgeProps {
  rating: number | string;
  reviewsCount?: number;
  count?: number;
  variant?: 'pill' | 'bookmark';
}

export function RatingBadge({
  rating,
  reviewsCount,
  count,
  variant = 'pill',
}: RatingBadgeProps) {
  const { colors } = useTheme();
  const resolvedCount = count ?? reviewsCount;
  const formattedRating =
    typeof rating === 'number' ? rating.toFixed(1) : rating;

  if (variant === 'bookmark') {
    return (
      <View
        style={[
          styles.bookmark,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.row}>
          <Ionicons name="star" size={13} color={colors.star} />
          <AppText variant="bodyBold" style={{ fontSize: 14 }}>
            {formattedRating}
          </AppText>
        </View>
        {resolvedCount !== undefined ? (
          <AppText variant="caption" style={{ fontSize: 11, color: colors.textMuted }}>
            ({resolvedCount})
          </AppText>
        ) : null}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: colors.warningLight,
          borderColor: colors.border,
        },
      ]}
    >
      <Ionicons name="star" size={12} color={colors.star} />
      <AppText variant="label" style={{ color: colors.text, fontSize: 12 }}>
        {formattedRating}
      </AppText>
      {resolvedCount !== undefined ? (
        <AppText variant="caption" style={{ color: colors.textMuted, fontSize: 11 }}>
          ({resolvedCount})
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  bookmark: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
});
