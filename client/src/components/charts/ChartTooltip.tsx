import { formatMoney } from '../../lib/format';

interface TooltipEntry {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  currency?: string;
  totalLabel?: string;
}

export function ChartTooltip({ active, payload, label, currency = 'USD', totalLabel }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="chart-tooltip">
      {label && <span className="chart-tooltip-label">{label}</span>}
      {payload.map((entry, index) => (
        <div className="chart-tooltip-row" key={`${entry.dataKey}-${index}`}>
          <span className="chart-tooltip-name">
            <i style={{ background: entry.color }} />
            {entry.name}
          </span>
          <strong>
            {formatMoney(Number(entry.value || 0), currency, { decimals: 0 })}
            {totalLabel ? ` ${totalLabel}` : ''}
          </strong>
        </div>
      ))}
    </div>
  );
}
