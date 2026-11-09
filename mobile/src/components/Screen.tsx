import { Screen as UiScreen, type ScreenProps } from '../ui/Screen';

export function Screen({ scrollable = true, scroll, ...rest }: ScreenProps) {
  return <UiScreen scrollable={scroll ?? scrollable} {...rest} />;
}

export type { ScreenProps };
