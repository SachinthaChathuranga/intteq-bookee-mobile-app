import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radius, spacing, typography } from './tokens';

interface Props {
  currentStep: number;
  totalSteps: number;
  steps: string[];
}

export function Stepper({ currentStep, totalSteps, steps }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '700' }]}>
        Step {currentStep} of {totalSteps}
      </Text>

      {/* Progress Bars Row */}
      <View style={styles.barsRow}>
        {steps.map((_, index) => {
          const isCompletedOrActive = index + 1 <= currentStep;
          return (
            <View
              key={index}
              style={[
                styles.bar,
                {
                  backgroundColor: isCompletedOrActive ? colors.primary : colors.border,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Step Labels Row */}
      <View style={styles.labelsRow}>
        {steps.map((label, index) => {
          const isActive = index + 1 === currentStep;
          return (
            <Text
              key={index}
              style={[
                typography.caption,
                styles.label,
                {
                  color: isActive ? colors.text : colors.textMuted,
                  fontWeight: isActive ? '700' : '500',
                },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
    marginVertical: spacing.sm,
  },
  barsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 2,
  },
  bar: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
  },
});
