import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';

interface Props {
  label: string;
  variant?: 'primary' | 'success' | 'warning';
}

export function Badge({ label, variant = 'primary' }: Props) {
  const { colors } = useTheme();

  const colorMap = {
    primary: colors.primary,
    success: colors.success,
    warning: colors.warning,
  };

  const activeColor = colorMap[variant];

  return (
    <View style={[styles.badge, { backgroundColor: colors.background, borderColor: activeColor }]}>
      <AppText variant="caption" style={{ color: activeColor, fontWeight: '600', fontSize: 12 }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
});
