import type { ReactElement, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  RefreshControlProps,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { spacing } from './tokens';

interface Props {
  children: ReactNode;
  scrollable?: boolean;
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
  scrollable = false,
  style,
  contentContainerStyle,
  refreshControl,
  refreshing,
  onRefresh,
  stickyFooter,
  includeTopInset = true,
  includeBottomInset = true,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

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
        {scrollable ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              contentContainerStyle,
              stickyFooter ? { paddingBottom: spacing.lg } : { paddingBottom: bottomInset + spacing.lg },
            ]}
            keyboardShouldPersistTaps="handled"
            refreshControl={effectiveRefreshControl}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

        ) : (
          <View style={[styles.staticContent, contentContainerStyle]}>{children}</View>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  stickyFooter: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
});
