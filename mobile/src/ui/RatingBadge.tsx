import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { palette } from '../theme/palette';
import { radius, spacing, typography } from './tokens';

interface Props {
  rating: number | string;
  reviewsCount?: number;
  variant?: 'pill' | 'bookmark';
}

export function RatingBadge({ rating, reviewsCount, variant = 'pill' }: Props) {
  const { colors } = useTheme();

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
          <Text style={[styles.star, { color: colors.primary }]}>★</Text>
          <Text style={[typography.bodyBold, { color: colors.text, fontSize: 15 }]}>
            {rating}
          </Text>
        </View>
        {reviewsCount !== undefined ? (
          <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>
            ({reviewsCount})
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.star, { color: colors.primary }]}>★</Text>
      <Text style={[typography.caption, { color: colors.text, fontWeight: '700' }]}>
        {rating}
      </Text>
      {reviewsCount !== undefined ? (
        <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>
          ({reviewsCount})
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    shadowColor: palette.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  bookmark: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  star: {
    fontSize: 14,
    fontWeight: '800',
  },
});
