import type { CSSProperties, ReactNode } from 'react';
import { clamp } from '../../lib/format';

interface ProgressBarProps {
  value: number;
  color?: string;
  tone?: 'default' | 'warning' | 'danger' | 'positive';
  height?: number;
  className?: string;
}

export function ProgressBar({ value, color, tone = 'default', height = 8, className = '' }: ProgressBarProps) {
  const percent = clamp(value, 0, 100);
  const fill = tone === 'danger'
    ? 'var(--danger)'
    : tone === 'warning'
      ? 'var(--warning)'
      : tone === 'positive'
        ? 'var(--accent)'
        : color || 'var(--accent)';
  return (
    <div
      className={`progress ${className}`}
      style={{ height } as CSSProperties}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
    >
      <span className="progress-fill" style={{ width: `${percent}%`, background: fill }} />
    </div>
  );
}

interface ProgressRingProps {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
  className?: string;
}

export function ProgressRing({
  value,
  size = 96,
  stroke = 8,
  color = 'var(--accent)',
  track = 'var(--ring-track)',
  children,
  className = '',
}: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamp(value, 0, 100) / 100);

  return (
    <div className={`ring ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      {children && <div className="ring-center">{children}</div>}
    </div>
  );
}
