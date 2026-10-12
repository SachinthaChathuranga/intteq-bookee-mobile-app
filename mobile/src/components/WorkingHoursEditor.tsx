import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import type { WorkingHoursDay } from '../api/owner';
import { useT } from '../i18n';
import type { TranslationKey } from '../i18n/en';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';

interface Props {
  value: WorkingHoursDay[];
  onChange: (hours: WorkingHoursDay[]) => void;
}

const DEFAULT_DAYS = [0, 1, 2, 3, 4, 5, 6];

export function WorkingHoursEditor({ value, onChange }: Props) {
  const t = useT();
  const { colors } = useTheme();

  // Ensure all 7 days exist in state
  const hoursMap = new Map<number, WorkingHoursDay>();
  for (const h of value) {
    hoursMap.set(h.day_of_week, h);
  }

  const normalized: WorkingHoursDay[] = DEFAULT_DAYS.map((day) => {
    return (
      hoursMap.get(day) ?? {
        day_of_week: day,
        open_time: '09:00',
        close_time: '20:00',
        is_closed: day === 0, // Sunday default closed
      }
    );
  });

  const updateDay = (day: number, patch: Partial<WorkingHoursDay>) => {
    const updated = normalized.map((item) => (item.day_of_week === day ? { ...item, ...patch } : item));
    onChange(updated);
  };

  const cleanTime = (tStr: string) => {
    // Trim seconds if given (e.g., '09:00:00' -> '09:00')
    return tStr.slice(0, 5);
  };

  return (
    <View style={styles.container}>
      <AppText variant="body" style={{ fontWeight: '700' }}>
        {t('branch.workingHours')}
      </AppText>

      {normalized.map((dayItem) => {
        const dayKey = `day.${dayItem.day_of_week}` as TranslationKey;
        const isClosed = dayItem.is_closed;

        return (
          <View
            key={dayItem.day_of_week}
            style={[
              styles.dayRow,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.dayHeader}>
              <AppText variant="body" style={{ fontWeight: '600', flex: 1 }}>
                {t(dayKey)}
              </AppText>
              <TouchableOpacity
                onPress={() => updateDay(dayItem.day_of_week, { is_closed: !isClosed })}
                style={[
                  styles.statusToggle,
                  {
                    backgroundColor: isClosed ? colors.background : colors.surface,
                    borderColor: isClosed ? colors.border : colors.success,
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  style={{
                    color: isClosed ? colors.textMuted : colors.success,
                    fontWeight: '700',
                  }}
                >
                  {isClosed ? t('branch.closed') : t('branch.open')}
                </AppText>
              </TouchableOpacity>
            </View>

            {!isClosed && (
              <View style={styles.timesContainer}>
                <View style={styles.timeBlock}>
                  <AppText variant="caption">{t('branch.openTime')}</AppText>
                  <TextInput
                    value={cleanTime(dayItem.open_time)}
                    placeholder="09:00"
                    placeholderTextColor={colors.textMuted}
                    maxLength={5}
                    onChangeText={(txt) => updateDay(dayItem.day_of_week, { open_time: txt })}
                    style={[
                      styles.timeInput,
                      {
                        color: colors.text,
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                  />
                </View>

                <AppText variant="body" style={{ color: colors.textMuted, paddingTop: 18 }}>
                  —
                </AppText>

                <View style={styles.timeBlock}>
                  <AppText variant="caption">{t('branch.closeTime')}</AppText>
                  <TextInput
                    value={cleanTime(dayItem.close_time)}
                    placeholder="20:00"
                    placeholderTextColor={colors.textMuted}
                    maxLength={5}
                    onChangeText={(txt) => updateDay(dayItem.day_of_week, { close_time: txt })}
                    style={[
                      styles.timeInput,
                      {
                        color: colors.text,
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  dayRow: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusToggle: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  timesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeBlock: {
    flex: 1,
    gap: 4,
  },
  timeInput: {
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
