import {
  Image,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radius } from './tokens';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface Props {
  source?: string | null;
  name?: string | null;
  size?: AvatarSize;
  status?: 'active' | 'paused' | 'offline' | 'busy';
  style?: StyleProp<ViewStyle>;
}

const sizeMap: Record<AvatarSize, number> = {
  sm: 32,
  md: 44,
  lg: 56,
  xl: 72,
};

const fontSizeMap: Record<AvatarSize, number> = {
  sm: 13,
  md: 17,
  lg: 22,
  xl: 28,
};

export function Avatar({ source, name, size = 'md', status, style }: Props) {
  const { colors } = useTheme();
  const dimension = sizeMap[size];
  const fontSize = fontSizeMap[size];

  const getInitials = (str?: string | null) => {
    if (!str) return '?';
    const parts = str.trim().split(/\s+/);
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  };

  const getStatusColor = () => {
    if (status === 'active') return colors.success;
    if (status === 'paused' || status === 'busy') return colors.warning;
    return colors.textMuted;
  };


  return (
    <View style={[{ width: dimension, height: dimension }, style]}>
      <View
        style={[
          styles.container,
          {
            width: dimension,
            height: dimension,
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        {source ? (
          <Image source={{ uri: source }} style={styles.image} resizeMode="cover" />
        ) : (
          <Text
            style={[
              styles.initials,
              {
                fontSize,
                color: colors.primary,
              },
            ]}
          >
            {getInitials(name)}
          </Text>
        )}
      </View>
      {status ? (
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: getStatusColor(),
              borderColor: colors.background,
              width: Math.max(10, dimension * 0.25),
              height: Math.max(10, dimension * 0.25),
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.full,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {
    fontWeight: '700',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: radius.full,
    borderWidth: 2,
  },
});
