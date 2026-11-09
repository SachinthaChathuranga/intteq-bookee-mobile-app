import { Button as UiButton, type ButtonVariant } from '../ui/Button';

interface Props {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
}

export function Button({ label, onPress, variant = 'primary', disabled, loading }: Props) {
  return (
    <UiButton
      label={label}
      onPress={onPress}
      variant={variant}
      disabled={disabled}
      loading={loading}
    />
  );
}
