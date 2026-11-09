import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from '../components/AppText';
import { useTheme } from '../theme/ThemeProvider';
import { selectionFeedback } from './haptics';
import { radius, spacing } from './tokens';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  leftIcon?: ReactNode | keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}

export function Chip({ label, selected = false, onPress, leftIcon, style }: ChipProps) {
  const { colors } = useTheme();
  const fg = selected ? colors.onPrimary : colors.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        if (!onPress) return;
        selectionFeedback();
        onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {leftIcon ? (
        <View style={styles.icon}>
          {typeof leftIcon === 'string' ? (
            <Ionicons name={leftIcon as keyof typeof Ionicons.glyphMap} size={14} color={fg} />
          ) : (
            leftIcon
          )}
        </View>
      ) : null}
      <AppText
        variant="label"
        style={{
          color: fg,
          fontWeight: selected ? '700' : '600',
          fontSize: 13,
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

export const FilterChip = Chip;

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 6,
  },
});
