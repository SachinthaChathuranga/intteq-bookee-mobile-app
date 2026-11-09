import { Badge as UiBadge, type BadgeTone } from '../ui/Badge';

type LegacyVariant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'info';

interface Props {
  label: string;
  variant?: LegacyVariant;
  dot?: boolean;
}

export function Badge({ label, variant = 'primary', dot }: Props) {
  return <UiBadge label={label} tone={variant as BadgeTone} dot={dot} />;
}
