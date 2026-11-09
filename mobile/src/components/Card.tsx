import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import { Card as UiCard } from '../ui/Card';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Card({ children, onPress, style }: Props) {
  return (
    <UiCard onPress={onPress} style={style}>
      {children}
    </UiCard>
  );
}
