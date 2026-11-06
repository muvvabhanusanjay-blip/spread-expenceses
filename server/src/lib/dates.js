const pad = (n) => String(n).padStart(2, '0');

export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayISO() {
  return toISODate(new Date());
}

export function monthKeyOf(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function shiftMonth(key, delta) {
  const [year, month] = key.split('-').map(Number);
  return monthKeyOf(new Date(year, month - 1 + delta, 1));
}

export function monthBounds(key) {
  const [year, month] = key.split('-').map(Number);
  const days = new Date(year, month, 0).getDate();
  return {
    key,
    start: `${key}-01`,
    end: `${key}-${pad(days)}`,
    days,
  };
}

export function isMonthKey(value) {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function isISODate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime());
}

export function monthLabel(key, style = 'short') {
  const [year, month] = key.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString('en-US', style === 'long'
    ? { month: 'long', year: 'numeric' }
    : { month: 'short' });
}

export function monthRangeBack(endKey, count) {
  return Array.from({ length: count }, (_, i) => shiftMonth(endKey, -(count - 1 - i)));
}

export function addMonthsToISO(iso, months) {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1 + months, day);
  return toISODate(date);
}

export function daysUntil(iso) {
  if (!iso) return null;
  const today = new Date(todayISO() + 'T00:00:00');
  const target = new Date(iso + 'T00:00:00');
  return Math.round((target - today) / 86400000);
}

export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
