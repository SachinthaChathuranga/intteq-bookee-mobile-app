import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from '../components/AppText';
import { useTheme } from '../theme/ThemeProvider';
import { radius } from './tokens';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Record<AvatarSize, number> = {
  xs: 28,
  sm: 36,
  md: 48,
  lg: 60,
  xl: 80,
};

export interface AvatarProps {
  name?: string | null;
  uri?: string | null;
  size?: AvatarSize;
  status?: 'online' | 'paused' | 'offline';
  style?: StyleProp<ViewStyle>;
}

export function Avatar({ name, uri, size = 'md', status, style }: AvatarProps) {
  const { colors } = useTheme();
  const dim = SIZE_MAP[size];

  const initials = (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  const statusColor =
    status === 'online'
      ? colors.success
      : status === 'paused'
        ? colors.warning
        : colors.textMuted;

  return (
    <View style={[{ width: dim, height: dim }, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[
            styles.image,
            {
              width: dim,
              height: dim,
              borderRadius: dim / 2,
              backgroundColor: colors.inputBackground,
              borderColor: colors.border,
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: dim,
              height: dim,
              borderRadius: dim / 2,
              backgroundColor: colors.primaryLight,
              borderColor: colors.primaryBorder,
            },
          ]}
        >
          <AppText
            variant="bodyBold"
            style={{
              color: colors.primary,
              fontSize: Math.max(11, Math.round(dim * 0.36)),
              lineHeight: Math.round(dim * 0.44),
              fontWeight: '700',
            }}
          >
            {initials || '?'}
          </AppText>
        </View>
      )}
      {status ? (
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: statusColor,
              borderColor: colors.surface,
              width: Math.max(10, Math.round(dim * 0.24)),
              height: Math.max(10, Math.round(dim * 0.24)),
              borderRadius: Math.max(5, Math.round(dim * 0.12)),
            },
          ]}
        />
      ) : null}
    </View>
  );
}

export interface AvatarGroupProps {
  items: { id: string; name?: string | null; uri?: string | null }[];
  max?: number;
  size?: AvatarSize;
}

export function AvatarGroup({ items, max = 4, size = 'sm' }: AvatarGroupProps) {
  const { colors } = useTheme();
  const dim = SIZE_MAP[size];
  const visible = items.slice(0, max);
  const overflow = items.length - visible.length;

  return (
    <View style={styles.groupRow}>
      {visible.map((item, idx) => (
        <View
          key={item.id}
          style={[
            styles.groupItem,
            {
              marginLeft: idx === 0 ? 0 : -Math.round(dim * 0.28),
              borderColor: colors.surface,
              borderRadius: radius.full,
            },
          ]}
        >
          <Avatar name={item.name} uri={item.uri} size={size} />
        </View>
      ))}
      {overflow > 0 ? (
        <View
          style={[
            styles.overflowCircle,
            {
              width: dim,
              height: dim,
              borderRadius: dim / 2,
              marginLeft: -Math.round(dim * 0.28),
              backgroundColor: colors.inputBackground,
              borderColor: colors.surface,
            },
          ]}
        >
          <AppText variant="label" style={{ color: colors.textSecondary, fontSize: 11 }}>
            +{overflow}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    resizeMode: 'cover',
    borderWidth: 1,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupItem: {
    borderWidth: 2,
  },
  overflowCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
