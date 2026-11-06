import type {
  Account,
  AccountDraft,
  AccountsResponse,
  AnalyticsData,
  BudgetsResponse,
  DashboardData,
  Goal,
  GoalDraft,
  GoalsResponse,
  SubscriptionsResponse,
  Transaction,
  TransactionDraft,
  TransactionsResponse,
  User,
} from './types';

const TOKEN_KEY = 'spendwise.token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

function buildQuery(query?: Query) {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const str = params.toString();
  return str ? `?${str}` : '';
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Query;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`/api${path}${buildQuery(options.query)}`, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401 && token) {
      clearToken();
      window.dispatchEvent(new Event('spendwise:unauthorized'));
    }
    const message = (data as { error?: string } | null)?.error || 'Something went wrong. Please try again.';
    throw new ApiError(message, response.status);
  }

  return data as T;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export const api = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/auth/login', { method: 'POST', body: { email, password } }),
  register: (name: string, email: string, password: string) =>
    request<LoginResponse>('/auth/register', { method: 'POST', body: { name, email, password } }),
  me: () => request<{ user: User }>('/auth/me'),
  updateProfile: (body: { name?: string; currency?: string }) =>
    request<{ user: User }>('/auth/profile', { method: 'PATCH', body }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: true }>('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),

  dashboard: (month?: string) => request<DashboardData>('/dashboard', { query: { month } }),
  analytics: (months: number) => request<AnalyticsData>('/analytics', { query: { months } }),

  accounts: () => request<AccountsResponse>('/accounts'),
  createAccount: (body: AccountDraft) =>
    request<{ account: Account }>('/accounts', { method: 'POST', body }),
  updateAccount: (id: string, body: Partial<AccountDraft> & { isArchived?: boolean }) =>
    request<{ account: Account }>(`/accounts/${id}`, { method: 'PATCH', body }),
  deleteAccount: (id: string) => request<{ ok: true }>(`/accounts/${id}`, { method: 'DELETE' }),

  transactions: (query: Query = {}) => request<TransactionsResponse>('/transactions', { query }),
  createTransaction: (body: TransactionDraft) =>
    request<{ transaction: Transaction }>('/transactions', { method: 'POST', body }),
  updateTransaction: (id: string, body: Partial<TransactionDraft>) =>
    request<{ transaction: Transaction }>(`/transactions/${id}`, { method: 'PATCH', body }),
  deleteTransaction: (id: string) => request<{ ok: true }>(`/transactions/${id}`, { method: 'DELETE' }),

  budgets: (month?: string) => request<BudgetsResponse>('/budgets', { query: { month } }),
  createBudget: (category: string, amount: number) =>
    request<{ budget: unknown }>('/budgets', { method: 'POST', body: { category, amount } }),
  updateBudget: (id: string, amount: number) =>
    request<{ budget: unknown }>(`/budgets/${id}`, { method: 'PATCH', body: { amount } }),
  deleteBudget: (id: string) => request<{ ok: true }>(`/budgets/${id}`, { method: 'DELETE' }),

  goals: () => request<GoalsResponse>('/goals'),
  createGoal: (body: GoalDraft) => request<{ goal: Goal }>('/goals', { method: 'POST', body }),
  updateGoal: (id: string, body: Partial<GoalDraft>) =>
    request<{ goal: Goal }>(`/goals/${id}`, { method: 'PATCH', body }),
  deleteGoal: (id: string) => request<{ ok: true }>(`/goals/${id}`, { method: 'DELETE' }),
  addContribution: (id: string, body: { amount: number; date?: string; note?: string }) =>
    request<{ goal: Goal }>(`/goals/${id}/contributions`, { method: 'POST', body }),
  deleteContribution: (goalId: string, contributionId: string) =>
    request<{ goal: Goal }>(`/goals/${goalId}/contributions/${contributionId}`, { method: 'DELETE' }),

  subscriptions: () => request<SubscriptionsResponse>('/subscriptions'),
  createSubscription: (body: Record<string, unknown>) =>
    request<{ subscription: unknown }>('/subscriptions', { method: 'POST', body }),
  updateSubscription: (id: string, body: Record<string, unknown>) =>
    request<{ subscription: unknown }>(`/subscriptions/${id}`, { method: 'PATCH', body }),
  deleteSubscription: (id: string) => request<{ ok: true }>(`/subscriptions/${id}`, { method: 'DELETE' }),

  resetDemo: () => request<{ ok: true }>('/demo/reset', { method: 'POST' }),
};

export async function downloadTransactionsCsv(query: Query = {}) {
  const token = getToken();
  const response = await fetch(`/api/transactions/export${buildQuery(query)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) {
    let message = 'Could not export transactions.';
    try {
      const data = await response.json();
      message = data.error || message;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, response.status);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `spendwise-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
