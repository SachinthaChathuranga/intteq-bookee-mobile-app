import { Badge } from '../../components/Badge';
import { formatCurrency } from '../../utils/format';

interface Props {
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
}

export function CommissionBadge({ type, value }: Props) {
  const label =
    type === 'PERCENTAGE'
      ? `${value}%`
      : `${formatCurrency(value)} / service`;

  return <Badge label={label} variant="primary" />;
}
