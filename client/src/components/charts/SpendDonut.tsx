import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { CategorySlice } from '../../lib/types';
import { formatMoney, formatPercent } from '../../lib/format';
import { ChartTooltip } from './ChartTooltip';

interface SpendDonutProps {
  categories: CategorySlice[];
  currency: string;
  total: number;
  centerLabel?: string;
  height?: number;
}

export function SpendDonut({ categories, currency, total, centerLabel = 'spent', height = 210 }: SpendDonutProps) {
  const sorted = [...categories].filter((category) => category.amount > 0);
  let slices = sorted;
  if (sorted.length > 6) {
    const top = sorted.slice(0, 5);
    const rest = sorted.slice(5);
    const restTotal = rest.reduce((sum, item) => sum + item.amount, 0);
    slices = [
      ...top,
      {
        id: 'other-combined',
        label: 'Other',
        color: '#5E6C84',
        amount: restTotal,
        count: rest.reduce((sum, item) => sum + item.count, 0),
        pct: total > 0 ? Math.round((restTotal / total) * 1000) / 10 : 0,
      },
    ];
  }

  if (!slices.length) {
    return (
      <div className="donut-empty" style={{ height }}>
        <div className="donut-empty-ring">
          <span>{formatMoney(total, currency, { decimals: 0 })}</span>
          <small>No spending yet</small>
        </div>
      </div>
    );
  }

  return (
    <div className="donut-layout">
      <div className="donut-chart" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="amount"
              nameKey="label"
              innerRadius="66%"
              outerRadius="92%"
              paddingAngle={2.4}
              cornerRadius={6}
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {slices.map((slice) => (
                <Cell key={slice.id} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip currency={currency} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <strong>{formatMoney(total, currency, { decimals: 0 })}</strong>
          <span>{centerLabel}</span>
        </div>
      </div>

      <div className="donut-legend">
        {slices.map((slice) => (
          <div className="legend-row" key={slice.id}>
            <span className="legend-dot" style={{ background: slice.color }} />
            <span className="legend-label">{slice.label}</span>
            <span className="legend-value">{formatMoney(slice.amount, currency, { decimals: 0 })}</span>
            <span className="legend-pct">{formatPercent(slice.pct)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
