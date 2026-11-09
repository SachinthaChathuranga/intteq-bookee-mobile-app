import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from '../components/AppText';
import { useTheme } from '../theme/ThemeProvider';
import { selectionFeedback } from './haptics';
import { getShadow, radius, spacing } from './tokens';

export interface SegmentOption<T extends string> {
  key: T;
  label: string;
  count?: number;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.inputBackground, borderColor: colors.border },
        style,
      ]}
    >
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (!active) {
                selectionFeedback();
                onChange(opt.key);
              }
            }}
            style={[
              styles.tab,
              active && [
                styles.activeTab,
                getShadow(colors, 'sm'),
                { backgroundColor: colors.surface, borderColor: colors.border },
              ],
            ]}
          >
            <AppText
              variant="label"
              style={{
                color: active ? colors.text : colors.textMuted,
                fontWeight: active ? '700' : '600',
                fontSize: 13,
              }}
              numberOfLines={1}
            >
              {opt.label}
            </AppText>
            {opt.count !== undefined ? (
              <View
                style={[
                  styles.countPill,
                  {
                    backgroundColor: active ? colors.primaryLight : colors.border,
                  },
                ]}
              >
                <AppText
                  variant="label"
                  style={{
                    color: active ? colors.primary : colors.textSecondary,
                    fontSize: 11,
                    lineHeight: 14,
                  }}
                >
                  {opt.count}
                </AppText>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  activeTab: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  countPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
});

