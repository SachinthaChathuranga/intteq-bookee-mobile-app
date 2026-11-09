import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Switch, TextInput, View } from 'react-native';
import type { WorkingHoursDay } from '../api/owner';
import { useT } from '../i18n';
import type { TranslationKey } from '../i18n/en';
import { useTheme } from '../theme/ThemeProvider';
import { radius, spacing } from '../ui/tokens';
import { AppText } from './AppText';

interface Props {
  value: WorkingHoursDay[];
  onChange: (days: WorkingHoursDay[]) => void;
}

const DEFAULT_DAYS: WorkingHoursDay[] = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
  day_of_week: d,
  open_time: '09:00',
  close_time: '18:00',
  is_closed: d === 0,
}));

export function WorkingHoursEditor({ value, onChange }: Props) {
  const t = useT();
  const { colors } = useTheme();

  const days = value.length === 7 ? value : DEFAULT_DAYS;

  const updateDay = (dayOfWeek: number, patch: Partial<WorkingHoursDay>) => {
    const next = days.map((d) =>
      d.day_of_week === dayOfWeek ? { ...d, ...patch } : d,
    );
    onChange(next);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Ionicons name="time-outline" size={18} color={colors.primary} />
        <AppText variant="heading3">{t('branch.workingHours')}</AppText>
      </View>

      {days.map((d) => {
        const dayKey = `day.${d.day_of_week}` as TranslationKey;
        const isOpen = !d.is_closed;

        return (
          <View
            key={d.day_of_week}
            style={[
              styles.row,
              {
                backgroundColor: colors.surface,
                borderColor: isOpen ? colors.border : colors.divider,
              },
            ]}
          >
            <View style={styles.topLine}>
              <View style={styles.dayLabelGroup}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isOpen ? colors.success : colors.textMuted },
                  ]}
                />
                <AppText variant="bodyBold">{t(dayKey)}</AppText>
              </View>
              <View style={styles.switchGroup}>
                <AppText
                  variant="caption"
                  style={{ color: isOpen ? colors.success : colors.textMuted, fontWeight: '600' }}
                >
                  {isOpen ? t('branch.open') : t('branch.closed')}
                </AppText>
                <Switch
                  value={isOpen}
                  onValueChange={(open) => updateDay(d.day_of_week, { is_closed: !open })}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.onPrimary}
                />
              </View>
            </View>

            {isOpen ? (
              <View style={[styles.timesRow, { borderTopColor: colors.divider }]}>
                <View style={styles.timeField}>
                  <AppText variant="label" style={{ color: colors.textMuted }}>
                    {t('branch.openTime')}
                  </AppText>
                  <TextInput
                    value={d.open_time.slice(0, 5)}
                    onChangeText={(txt) => updateDay(d.day_of_week, { open_time: txt })}
                    placeholder="09:00"
                    placeholderTextColor={colors.placeholder}
                    style={[
                      styles.timeInput,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.inputBackground,
                      },
                    ]}
                  />
                </View>

                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={colors.textMuted}
                  style={{ marginTop: 18 }}
                />

                <View style={styles.timeField}>
                  <AppText variant="label" style={{ color: colors.textMuted }}>
                    {t('branch.closeTime')}
                  </AppText>
                  <TextInput
                    value={d.close_time.slice(0, 5)}
                    onChangeText={(txt) => updateDay(d.day_of_week, { close_time: txt })}
                    placeholder="18:00"
                    placeholderTextColor={colors.placeholder}
                    style={[
                      styles.timeInput,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.inputBackground,
                      },
                    ]}
                  />
                </View>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm + 2,
    marginTop: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  row: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  topLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  switchGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  timeField: {
    flex: 1,
    gap: 4,
  },
  timeInput: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
