import type { ReactNode } from 'react';
import {
  Image,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { palette } from '../theme/palette';
import { lightImpact } from './haptics';
import { radius, spacing } from './tokens';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  noPadding?: boolean;
  coverImage?: string;
  coverHeight?: number;
  floatingBadge?: ReactNode;
  floatingAction?: ReactNode;
  highlighted?: boolean;
}

export function Card({
  children,
  onPress,
  style,
  noPadding = false,
  coverImage,
  coverHeight = 160,
  floatingBadge,
  floatingAction,
  highlighted = false,
}: Props) {
  const { colors } = useTheme();

  const handlePress = () => {
    if (onPress) {
      lightImpact();
      onPress();
    }
  };

  const content = (
    <>
      {coverImage ? (
        <View style={styles.coverWrapper}>
          <Image
            source={{ uri: coverImage }}
            style={[styles.cover, { height: coverHeight }]}
            resizeMode="cover"
          />
          {floatingBadge ? <View style={styles.floatingBadge}>{floatingBadge}</View> : null}
          {floatingAction ? <View style={styles.floatingAction}>{floatingAction}</View> : null}
        </View>
      ) : null}
      <View style={!noPadding ? styles.padded : undefined}>{children}</View>
    </>
  );

  const cardBg = highlighted ? colors.primaryLight : colors.surface;
  const cardBorder = highlighted ? colors.primary : colors.border;

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={handlePress}
        style={({ pressed }) => [
          styles.base,
          {
            backgroundColor: cardBg,
            borderColor: cardBorder,
            borderWidth: highlighted ? 1.5 : 1,
            opacity: pressed ? 0.88 : 1,
            transform: [{ scale: pressed ? 0.99 : 1 }],
          },
          style,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: cardBg,
          borderColor: cardBorder,
          borderWidth: highlighted ? 1.5 : 1,
        },
        style,
      ]}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: palette.neutral[900],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  coverWrapper: {
    width: '100%',
    position: 'relative',
  },
  cover: {
    width: '100%',
  },
  floatingBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 2,
  },
  floatingAction: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
  },
  padded: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
});


