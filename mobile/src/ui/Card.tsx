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
import { lightImpact } from './haptics';
import { radius, spacing } from './tokens';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  noPadding?: boolean;
  coverImage?: string;
  coverHeight?: number;
}

export function Card({
  children,
  onPress,
  style,
  noPadding = false,
  coverImage,
  coverHeight = 150,
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
        <Image
          source={{ uri: coverImage }}
          style={[styles.cover, { height: coverHeight }]}
          resizeMode="cover"
        />
      ) : null}
      <View style={!noPadding ? styles.padded : undefined}>{children}</View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={handlePress}
        style={({ pressed }) => [
          styles.base,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.85 : 1,
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
          backgroundColor: colors.surface,
          borderColor: colors.border,
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
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
  },
  padded: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
});

