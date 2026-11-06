import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { formatMoney } from '../../lib/format';
import { ChartTooltip } from './ChartTooltip';

interface WeekdayBarsProps {
  data: { day: string; amount: number }[];
  currency: string;
  height?: number;
}

export function WeekdayBars({ data, currency, height = 190 }: WeekdayBarsProps) {
  const max = Math.max(...data.map((item) => item.amount), 1);

  return (
    <div className="chart-wrap" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-3)', fontSize: 11 }}
            dy={6}
          />
          <Tooltip
            content={<ChartTooltip currency={currency} />}
            cursor={{ fill: 'var(--chart-cursor)' }}
          />
          <Bar dataKey="amount" name="Spent" radius={[5, 5, 5, 5]} maxBarSize={26}>
            {data.map((item) => (
              <Cell
                key={item.day}
                fill={item.amount === max ? '#3EE8A7' : 'color-mix(in srgb, #3EE8A7 28%, transparent)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
