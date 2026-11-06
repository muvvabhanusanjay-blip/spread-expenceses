import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { CashflowPoint } from '../../lib/types';
import { formatCompact } from '../../lib/format';
import { ChartTooltip } from './ChartTooltip';

interface CashflowChartProps {
  data: CashflowPoint[];
  currency: string;
  height?: number;
}

export function CashflowChart({ data, currency, height = 268 }: CashflowChartProps) {
  return (
    <div className="chart-wrap" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3EE8A7" stopOpacity={0.34} />
              <stop offset="100%" stopColor="#3EE8A7" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7C8CF8" stopOpacity={0.26} />
              <stop offset="100%" stopColor="#7C8CF8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 6" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-3)', fontSize: 11.5 }}
            dy={10}
            padding={{ left: 8, right: 8 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={54}
            tick={{ fill: 'var(--text-3)', fontSize: 11 }}
            tickFormatter={(value) => formatCompact(Number(value), currency)}
          />
          <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ stroke: 'var(--border-strong)', strokeDasharray: '4 4' }} />
          <Area
            type="monotone"
            dataKey="income"
            name="Income"
            stroke="#3EE8A7"
            strokeWidth={2.2}
            fill="url(#incomeFill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
          />
          <Area
            type="monotone"
            dataKey="expense"
            name="Expenses"
            stroke="#7C8CF8"
            strokeWidth={2.2}
            fill="url(#expenseFill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
