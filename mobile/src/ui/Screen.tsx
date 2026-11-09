import type { ReactElement, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  type RefreshControlProps,
  ScrollView,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { spacing } from './tokens';

export interface ScreenProps {
  children: ReactNode;
  scrollable?: boolean;
  scroll?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  refreshControl?: ReactElement<RefreshControlProps>;
  refreshing?: boolean;
  onRefresh?: () => void;
  stickyFooter?: ReactNode;
  includeTopInset?: boolean;
  includeBottomInset?: boolean;
}

export function Screen({
  children,
  scrollable,
  scroll,
  padded = true,
  style,
  contentContainerStyle,
  refreshControl,
  refreshing,
  onRefresh,
  stickyFooter,
  includeTopInset = true,
  includeBottomInset = true,
}: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const isScrollable = scroll ?? scrollable ?? false;
  const topInset = includeTopInset ? insets.top : 0;
  const bottomInset = includeBottomInset ? insets.bottom : 0;

  const effectiveRefreshControl =
    refreshControl ??
    (onRefresh !== undefined ? (
      <RefreshControl
        refreshing={Boolean(refreshing)}
        onRefresh={onRefresh}
        tintColor={colors.primary}
        colors={[colors.primary]}
      />
    ) : undefined);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: topInset,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
          style,
        ]}
      >
        {isScrollable ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              padded && styles.scrollContent,
              contentContainerStyle,
              stickyFooter
                ? { paddingBottom: spacing.lg }
                : { paddingBottom: bottomInset + spacing.lg },
            ]}
            keyboardShouldPersistTaps="handled"
            refreshControl={effectiveRefreshControl}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View
            style={[
              styles.staticContent,
              padded && styles.staticPadded,
              contentContainerStyle,
            ]}
          >
            {children}
          </View>
        )}

        {stickyFooter ? (
          <View
            style={[
              styles.stickyFooter,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
                paddingBottom: bottomInset + spacing.md,
              },
            ]}
          >
            {stickyFooter}
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  staticContent: {
    flex: 1,
  },
  staticPadded: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  stickyFooter: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
});
