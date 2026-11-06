export const EXPENSE_CATEGORIES = [
  { id: 'housing', label: 'Housing', color: '#7C8CF8', kind: 'expense' },
  { id: 'groceries', label: 'Groceries', color: '#3EE8A7', kind: 'expense' },
  { id: 'dining', label: 'Dining', color: '#FBBF24', kind: 'expense' },
  { id: 'transport', label: 'Transport', color: '#38BDF8', kind: 'expense' },
  { id: 'shopping', label: 'Shopping', color: '#F472B6', kind: 'expense' },
  { id: 'entertainment', label: 'Entertainment', color: '#A78BFA', kind: 'expense' },
  { id: 'health', label: 'Health', color: '#2DD4BF', kind: 'expense' },
  { id: 'utilities', label: 'Utilities', color: '#F59E0B', kind: 'expense' },
  { id: 'travel', label: 'Travel', color: '#60A5FA', kind: 'expense' },
  { id: 'education', label: 'Education', color: '#FCD34D', kind: 'expense' },
  { id: 'subscriptions', label: 'Subscriptions', color: '#C084FC', kind: 'expense' },
  { id: 'personal', label: 'Personal', color: '#FB7185', kind: 'expense' },
  { id: 'insurance', label: 'Insurance', color: '#94A3B8', kind: 'expense' },
  { id: 'fees', label: 'Fees & charges', color: '#FDA4AF', kind: 'expense' },
  { id: 'other', label: 'Other', color: '#8FA3BF', kind: 'expense' },
];

export const INCOME_CATEGORIES = [
  { id: 'salary', label: 'Salary', color: '#3EE8A7', kind: 'income' },
  { id: 'freelance', label: 'Freelance', color: '#38BDF8', kind: 'income' },
  { id: 'investments', label: 'Investments', color: '#A78BFA', kind: 'income' },
  { id: 'gifts', label: 'Gifts', color: '#F472B6', kind: 'income' },
  { id: 'refunds', label: 'Refunds', color: '#FBBF24', kind: 'income' },
  { id: 'other-income', label: 'Other income', color: '#8FA3BF', kind: 'income' },
];

export const CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY'];

export const ACCOUNT_TYPES = ['checking', 'savings', 'credit', 'cash', 'investment'];

export const ACCOUNT_TYPE_LABELS = {
  checking: 'Checking',
  savings: 'Savings',
  credit: 'Credit card',
  cash: 'Cash',
  investment: 'Investment',
};

export const FREQUENCIES = ['weekly', 'monthly', 'quarterly', 'yearly'];
