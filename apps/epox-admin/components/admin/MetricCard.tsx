import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  icon: LucideIcon;
  iconVariant?: 'accent' | 'success' | 'primary';
  value: number | string;
  label: string;
  trend?: string;
  testId?: string;
}

export function MetricCard({
  icon: Icon,
  iconVariant = 'accent',
  value,
  label,
  trend,
  testId,
}: MetricCardProps) {
  return (
    <div className="metric-card" data-testid={testId}>
      <div className="metric-card__header">
        <div className={`metric-card__icon metric-card__icon--${iconVariant}`}>
          <Icon size={24} />
        </div>
      </div>

      <div className="metric-card__value">{value}</div>
      <p className="metric-card__label">{label}</p>

      {trend && <div className="metric-card__trend">{trend}</div>}
    </div>
  );
}
