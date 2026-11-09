import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { useTheme } from '../theme/ThemeProvider';
import { radius, spacing } from './tokens';

export interface StepperProps {
  steps: string[];
  currentStep: number; // 0-based index
}

export function Stepper({ steps, currentStep }: StepperProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;

        return (
          <View key={step} style={styles.stepWrapper}>
            <View style={styles.stepRow}>
              <View
                style={[
                  styles.circle,
                  {
                    backgroundColor:
                      isActive || isCompleted ? colors.primary : colors.inputBackground,
                    borderColor:
                      isActive || isCompleted ? colors.primary : colors.border,
                  },
                ]}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
                ) : (
                  <AppText
                    variant="label"
                    style={{
                      color: isActive ? colors.onPrimary : colors.textMuted,
                      fontWeight: '700',
                    }}
                  >
                    {index + 1}
                  </AppText>
                )}
              </View>
              {index < steps.length - 1 ? (
                <View
                  style={[
                    styles.line,
                    {
                      backgroundColor: isCompleted ? colors.primary : colors.border,
                    },
                  ]}
                />
              ) : null}
            </View>
            <AppText
              variant="label"
              style={{
                color: isActive ? colors.primary : isCompleted ? colors.text : colors.textMuted,
                fontWeight: isActive ? '700' : '500',
                marginTop: 4,
              }}
              numberOfLines={1}
            >
              {step}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  stepWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  line: {
    position: 'absolute',
    left: '50%',
    right: '-50%',
    height: 2,
    zIndex: 1,
  },
});
