import { format, isToday, isYesterday } from 'date-fns';

const LOCALES: Record<string, string> = {
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  INR: 'en-IN',
  CAD: 'en-CA',
  AUD: 'en-AU',
  JPY: 'ja-JP',
};

export function currencySymbol(currency = 'USD') {
  try {
    const parts = new Intl.NumberFormat(LOCALES[currency] || 'en-US', {
      style: 'currency',
      currency,
    }).formatToParts(0);
    return parts.find((part) => part.type === 'currency')?.value || currency;
  } catch {
    return currency;
  }
}

export function formatMoney(
  value: number,
  currency = 'USD',
  options: { decimals?: number; compact?: boolean; sign?: boolean } = {}
) {
  const { decimals = 2, compact = false, sign = false } = options;
  try {
    return new Intl.NumberFormat(LOCALES[currency] || 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: compact ? 0 : decimals,
      maximumFractionDigits: compact ? 1 : decimals,
      notation: compact ? 'compact' : 'standard',
      signDisplay: sign ? 'exceptZero' : 'auto',
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(decimals)}`;
  }
}

export function formatCompact(value: number, currency = 'USD') {
  return formatMoney(value, currency, { compact: true });
}

export function formatPercent(value: number, digits = 0) {
  return `${Number(value).toFixed(digits)}%`;
}

export function parseISODate(iso: string) {
  return new Date(`${iso}T12:00:00`);
}

export function formatDate(iso: string, pattern = 'MMM d, yyyy') {
  try {
    return format(parseISODate(iso), pattern);
  } catch {
    return iso;
  }
}

export function formatDayHeading(iso: string) {
  const date = parseISODate(iso);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, MMM d');
}

export function formatMonth(key: string, style: 'short' | 'long' = 'long') {
  const [year, month] = key.split('-').map(Number);
  return format(new Date(year, month - 1, 1), style === 'long' ? 'MMMM yyyy' : 'MMM');
}

export function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftMonthKey(key: string, delta: number) {
  const [year, month] = key.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthOptions(count = 12) {
  const options: { value: string; label: string }[] = [{ value: 'all', label: 'All time' }];
  for (let i = 0; i < count; i += 1) {
    const key = shiftMonthKey(currentMonthKey(), -i);
    options.push({ value: key, label: i === 0 ? `This month · ${formatMonth(key)}` : formatMonth(key) });
  }
  return options;
}

export function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function dueLabel(days: number | null | undefined) {
  if (days == null) return '';
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days}d`;
}

export function relativeDate(iso: string) {
  const date = parseISODate(iso);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
}

export function greeting(name?: string) {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const first = name?.trim().split(/\s+/)[0];
  return first ? `${part}, ${first}` : part;
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export function firstName(name?: string) {
  return name?.trim().split(/\s+/)[0] || '';
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
