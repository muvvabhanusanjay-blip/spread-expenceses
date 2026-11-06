import { ApiError } from './errors.js';
import { CATEGORY_MAP, EXPENSE_CATEGORIES } from '../constants.js';
import { isISODate, isMonthKey, round2, todayISO } from './dates.js';

export function requireString(value, label, { min = 1, max = 200 } = {}) {
  const str = typeof value === 'string' ? value.trim() : '';
  if (str.length < min) throw new ApiError(400, `${label} is required.`);
  if (str.length > max) throw new ApiError(400, `${label} must be under ${max} characters.`);
  return str;
}

export function optionalString(value, max = 200) {
  if (value == null) return '';
  if (typeof value !== 'string') throw new ApiError(400, 'Invalid text value.');
  return value.trim().slice(0, max);
}

export function parseAmount(value, label = 'Amount') {
  const amount = round2(Number(value));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, `${label} must be greater than zero.`);
  }
  if (amount > 100000000) throw new ApiError(400, `${label} is too large.`);
  return amount;
}

export function parseISODate(value, label = 'Date') {
  if (!isISODate(value)) throw new ApiError(400, `Please provide a valid ${label.toLowerCase()}.`);
  return value;
}

export function parseMonth(value, fallback = todayISO().slice(0, 7)) {
  if (value == null || value === '') return fallback;
  if (!isMonthKey(value)) throw new ApiError(400, 'Invalid month.');
  return value;
}

export function parseExpenseCategory(value) {
  const category = CATEGORY_MAP[value];
  if (!category || category.kind !== 'expense') {
    throw new ApiError(400, 'Choose a valid expense category.');
  }
  return category.id;
}

export function parseCategoryForType(value, type) {
  if (type === 'transfer') return 'transfer';
  const category = CATEGORY_MAP[value];
  if (!category || category.kind !== type) {
    throw new ApiError(400, 'Choose a valid category for this transaction.');
  }
  return category.id;
}

export function parseTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags
    .filter((t) => typeof t === 'string')
    .map((t) => t.trim().slice(0, 24))
    .filter(Boolean))].slice(0, 6);
}

export function parseEnum(value, values, label, fallback) {
  if (value == null || value === '') {
    if (fallback !== undefined) return fallback;
    throw new ApiError(400, `Choose a valid ${label.toLowerCase()}.`);
  }
  if (!values.includes(value)) throw new ApiError(400, `Choose a valid ${label.toLowerCase()}.`);
  return value;
}

export function expenseCategoryIds() {
  return EXPENSE_CATEGORIES.map((c) => c.id);
}
