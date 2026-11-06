export type TransactionType = 'income' | 'expense' | 'transfer';
export type Theme = 'dark' | 'light';

export interface User {
  id: string;
  name: string;
  email: string;
  currency: string;
  isDemo: boolean;
  createdAt: string;
}

export interface AccountRef {
  id: string;
  name: string;
  type: string;
  last4: string;
  color: string;
}

export interface Account extends AccountRef {
  institution: string;
  openingBalance: number;
  isArchived: boolean;
  balance: number;
  txCount: number;
  monthIn: number;
  monthOut: number;
}

export interface AccountsResponse {
  accounts: Account[];
  summary: {
    netWorth: number;
    assets: number;
    liabilities: number;
    activeCount: number;
    archivedCount: number;
  };
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  merchant: string;
  note: string;
  date: string;
  tags: string[];
  account: AccountRef | null;
  toAccount: AccountRef | null;
  createdAt?: string;
}

export interface TransactionsResponse {
  items: Transaction[];
  total: number;
  page: number;
  pages: number;
  summary: { income: number; expense: number; net: number; count: number };
}

export interface Budget {
  id: string;
  category: string;
  label: string;
  color: string;
  amount: number;
  spent: number;
  remaining: number;
  pct: number;
}

export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  pct: number;
}

export interface BudgetsResponse {
  month: string;
  monthLabel: string;
  daysLeft: number;
  budgets: Budget[];
  summary: BudgetSummary;
}

export interface GoalContribution {
  id: string;
  amount: number;
  date: string;
  note: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  deadline: string | null;
  color: string;
  icon: string;
  saved: number;
  remaining: number;
  contributions: GoalContribution[];
  contributionCount: number;
  pct: number;
  daysLeft: number | null;
  monthlyNeeded: number;
}

export interface GoalsResponse {
  goals: Goal[];
  summary: { count: number; totalSaved: number; totalTarget: number; pct: number };
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  category: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  nextDate: string;
  active: boolean;
  notes: string;
  account: { id: string; name: string; color: string } | null;
  monthlyAmount: number;
  daysUntil?: number;
}

export interface SubscriptionsResponse {
  items: Subscription[];
  summary: {
    activeCount: number;
    monthlyTotal: number;
    yearlyTotal: number;
    dueThisWeek: number;
    dueThisMonth: number;
  };
}

export interface CashflowPoint {
  key: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

export interface CategorySlice {
  id: string;
  label: string;
  color: string;
  amount: number;
  count: number;
  pct: number;
}

export interface MerchantSlice {
  name: string;
  amount: number;
  count: number;
}

export interface Insight {
  kind: 'budget' | 'trend' | 'savings' | 'bills' | 'onboarding';
  tone: 'positive' | 'warning' | 'neutral';
  title: string;
  message: string;
}

export interface DashboardData {
  month: string;
  monthLabel: string;
  today: string;
  summary: {
    netWorth: number;
    assets: number;
    liabilities: number;
    netFlow: number;
    income: number;
    expense: number;
    transactionCount: number;
    savingsRate: number;
    incomeChange: number;
    expenseChange: number;
    budgetPct: number;
    goalsSaved: number;
    goalsTarget: number;
  };
  accounts: { id: string; name: string; type: string; last4: string; color: string; balance: number }[];
  cashflow: CashflowPoint[];
  categories: CategorySlice[];
  budgets: Budget[];
  budgetSummary: BudgetSummary;
  goals: Goal[];
  recent: Transaction[];
  upcoming: Subscription[];
  dailySpend: { date: string; amount: number }[];
  insights: Insight[];
  topMerchant: MerchantSlice | null;
}

export interface AnalyticsCategory extends CategorySlice {
  prevAmount: number;
  changePct: number;
}

export interface AnalyticsData {
  months: number;
  endMonth: string;
  range: { from: string; to: string; label: string; count: number };
  summary: {
    totalIncome: number;
    totalExpense: number;
    net: number;
    savingsRate: number;
    avgIncome: number;
    avgExpense: number;
    avgDaily: number;
    transactionCount: number;
    incomeChange: number;
    expenseChange: number;
    topCategory: AnalyticsCategory | null;
    topMerchant: MerchantSlice | null;
    bestMonth: CashflowPoint | null;
    spendiestMonth: CashflowPoint | null;
    peakWeekday: { day: string; amount: number } | null;
    incomeSources: CategorySlice[];
    accounts: {
      id: string;
      name: string;
      type: string;
      color: string;
      last4: string;
      balance: number;
      pct: number;
    }[];
    assets: number;
    liabilities: number;
    netWorth: number;
  };
  cashflow: CashflowPoint[];
  categories: AnalyticsCategory[];
  merchants: MerchantSlice[];
  dailySpend: { date: string; amount: number }[];
  weekday: { day: string; amount: number }[];
  hasPreviousData: boolean;
}

export interface GoalDraft {
  name: string;
  targetAmount: number;
  deadline?: string | null;
  color?: string;
  icon?: string;
  initialAmount?: number;
}

export interface AccountDraft {
  name: string;
  type: string;
  institution?: string;
  last4?: string;
  openingBalance?: number;
  color?: string;
}

export interface TransactionDraft {
  type: TransactionType;
  amount: number;
  account: string;
  toAccount?: string | null;
  category: string;
  merchant?: string;
  note?: string;
  date: string;
  tags?: string[];
}
