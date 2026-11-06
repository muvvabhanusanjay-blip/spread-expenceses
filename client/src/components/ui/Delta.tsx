import { TrendingDown, TrendingUp } from 'lucide-react';

interface DeltaProps {
  value: number;
  invert?: boolean;
  suffix?: string;
  decimals?: number;
}

export function Delta({ value, invert = false, suffix, decimals = 1 }: DeltaProps) {
  const flat = Math.abs(value) < 0.05;
  const good = invert ? value < 0 : value > 0;
  const tone = flat ? 'neutral' : good ? 'positive' : 'negative';
  const Icon = value < 0 ? TrendingDown : TrendingUp;

  return (
    <span className="delta-wrap">
      <span className={`delta delta-${tone}`}>
        {!flat && <Icon size={13} strokeWidth={2.4} />}
        {value > 0 ? '+' : ''}
        {value.toFixed(decimals)}%
      </span>
      {suffix && <span className="delta-suffix">{suffix}</span>}
    </span>
  );
}
