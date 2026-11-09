import { Ionicons } from '@expo/vector-icons';
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { useTheme } from '../theme/ThemeProvider';
import { lightImpact, successNotification } from './haptics';
import { getShadow, radius, spacing } from './tokens';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  title: string;
  message?: string;
  tone?: ToastTone;
  durationMs?: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setToast(null));
  }, [opacity, translateY]);

  const showToast = useCallback(
    (options: ToastOptions) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToast(options);
      if (options.tone === 'success') {
        successNotification();
      } else {
        lightImpact();
      }
      translateY.setValue(-100);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 22,
          bounciness: 6,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

      timerRef.current = setTimeout(() => {
        hideToast();
      }, options.durationMs ?? 3200);
    },
    [hideToast, opacity, translateY],
  );

  const tone = toast?.tone ?? 'info';
  const iconMap: Record<ToastTone, keyof typeof Ionicons.glyphMap> = {
    success: 'checkmark-circle',
    error: 'alert-circle',
    warning: 'warning',
    info: 'information-circle',
  };

  const colorMap: Record<ToastTone, string> = {
    success: colors.success,
    error: colors.danger,
    warning: colors.warning,
    info: colors.primary,
  };

  const bgMap: Record<ToastTone, string> = {
    success: colors.successLight,
    error: colors.dangerLight,
    warning: colors.warningLight,
    info: colors.primaryLight,
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.wrapper,
            {
              top: Math.max(insets.top + spacing.sm, spacing.lg),
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <Pressable
            onPress={hideToast}
            style={[
              styles.toastCard,
              getShadow(colors, 'lg'),
              {
                backgroundColor: colors.elevatedSurface,
                borderColor: colorMap[tone],
              },
            ]}
          >
            <View style={[styles.iconBadge, { backgroundColor: bgMap[tone] }]}>
              <Ionicons name={iconMap[tone]} size={20} color={colorMap[tone]} />
            </View>
            <View style={styles.textCol}>
              <AppText variant="bodyBold" numberOfLines={1}>
                {toast.title}
              </AppText>
              {toast.message ? (
                <AppText variant="caption" style={{ color: colors.textSecondary }} numberOfLines={2}>
                  {toast.message}
                </AppText>
              ) : null}
            </View>
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </Pressable>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
});

