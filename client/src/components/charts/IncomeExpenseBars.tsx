import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { CashflowPoint } from '../../lib/types';
import { formatCompact } from '../../lib/format';
import { ChartTooltip } from './ChartTooltip';

interface IncomeExpenseBarsProps {
  data: CashflowPoint[];
  currency: string;
  height?: number;
}

export function IncomeExpenseBars({ data, currency, height = 300 }: IncomeExpenseBarsProps) {
  return (
    <div className="chart-wrap" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 6" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-3)', fontSize: 11.5 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={54}
            tick={{ fill: 'var(--text-3)', fontSize: 11 }}
            tickFormatter={(value) => formatCompact(Number(value), currency)}
          />
          <Tooltip
            content={<ChartTooltip currency={currency} />}
            cursor={{ fill: 'var(--chart-cursor)' }}
          />
          <Bar dataKey="income" name="Income" fill="#3EE8A7" radius={[5, 5, 0, 0]} maxBarSize={22} />
          <Bar dataKey="expense" name="Expenses" fill="#7C8CF8" radius={[5, 5, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
