import type { ReactNode } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { lightImpact } from './haptics';
import { spacing, typography } from './tokens';

interface Props {
  title: string;
  subtitle?: string | null;
  leading?: ReactNode;
  left?: ReactNode;
  trailing?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ListItem({
  title,
  subtitle,
  leading,
  left,
  trailing,
  right,
  onPress,
  showChevron,
  style,
}: Props) {
  const { colors } = useTheme();

  const handlePress = () => {
    if (onPress) {
      lightImpact();
      onPress();
    }
  };

  const leadNode = leading ?? left;
  const trailNode = trailing ?? right;
  const hasChevron = showChevron !== undefined ? showChevron : Boolean(onPress);

  const content = (
    <View style={[styles.inner, style]}>
      {leadNode ? <View style={styles.leading}>{leadNode}</View> : null}
      <View style={styles.textContainer}>
        <Text style={[typography.bodyBold, { color: colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[typography.caption, { color: colors.textMuted }]}>{subtitle}</Text>
        ) : null}
      </View>
      {trailNode ? <View style={styles.trailing}>{trailNode}</View> : null}
      {hasChevron ? (
        <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
      ) : null}
    </View>
  );


  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={handlePress}
        style={({ pressed }) => [
          styles.pressable,
          {
            backgroundColor: pressed ? colors.surface : 'transparent',
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 8,
  },
  inner: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    gap: spacing.md,
  },
  leading: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  trailing: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  chevron: {
    fontSize: 22,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
});
