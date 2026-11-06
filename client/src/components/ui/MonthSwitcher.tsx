import { ChevronLeft, ChevronRight } from 'lucide-react';
import { currentMonthKey, formatMonth, shiftMonthKey } from '../../lib/format';

interface MonthSwitcherProps {
  value: string;
  onChange: (key: string) => void;
  allowFuture?: boolean;
  className?: string;
}

export function MonthSwitcher({ value, onChange, allowFuture = false, className = '' }: MonthSwitcherProps) {
  const current = currentMonthKey();
  const nextDisabled = !allowFuture && value >= current;

  return (
    <div className={`month-switcher ${className}`}>
      <button
        type="button"
        className="month-arrow"
        onClick={() => onChange(shiftMonthKey(value, -1))}
        aria-label="Previous month"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="month-label">{formatMonth(value)}</span>
      <button
        type="button"
        className="month-arrow"
        onClick={() => onChange(shiftMonthKey(value, 1))}
        aria-label="Next month"
        disabled={nextDisabled}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
