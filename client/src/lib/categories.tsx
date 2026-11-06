import type { ComponentType } from 'react';
import {
  Home, ShoppingCart, Utensils, Car, ShoppingBag, Clapperboard, HeartPulse, Zap, Plane,
  GraduationCap, RefreshCcw, Sparkles, ShieldCheck, ReceiptText, Layers, Banknote, Laptop,
  TrendingUp, ArrowDownLeft, CircleDollarSign, Wallet, PiggyBank, CreditCard, Target,
  Gift as GiftIcon, Music, Laptop as LaptopIcon, Shield, Coffee, Briefcase, Landmark, Globe,
} from 'lucide-react';

export type IconType = ComponentType<{
  size?: number | string;
  strokeWidth?: number;
  className?: string;
  color?: string;
}>;

export interface CategoryMeta {
  id: string;
  label: string;
  color: string;
  kind: 'expense' | 'income';
}

export const EXPENSE_CATEGORIES: CategoryMeta[] = [
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

export const INCOME_CATEGORIES: CategoryMeta[] = [
  { id: 'salary', label: 'Salary', color: '#3EE8A7', kind: 'income' },
  { id: 'freelance', label: 'Freelance', color: '#38BDF8', kind: 'income' },
  { id: 'investments', label: 'Investments', color: '#A78BFA', kind: 'income' },
  { id: 'gifts', label: 'Gifts', color: '#F472B6', kind: 'income' },
  { id: 'refunds', label: 'Refunds', color: '#FBBF24', kind: 'income' },
  { id: 'other-income', label: 'Other income', color: '#8FA3BF', kind: 'income' },
];

export const CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export const CATEGORY_MAP: Record<string, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((category) => [category.id, category])
);

export const CATEGORY_ICONS: Record<string, IconType> = {
  housing: Home,
  groceries: ShoppingCart,
  dining: Utensils,
  transport: Car,
  shopping: ShoppingBag,
  entertainment: Clapperboard,
  health: HeartPulse,
  utilities: Zap,
  travel: Plane,
  education: GraduationCap,
  subscriptions: RefreshCcw,
  personal: Sparkles,
  insurance: ShieldCheck,
  fees: ReceiptText,
  other: Layers,
  salary: Banknote,
  freelance: Laptop,
  investments: TrendingUp,
  gifts: GiftIcon,
  refunds: ArrowDownLeft,
  'other-income': CircleDollarSign,
  transfer: ArrowDownLeft,
};

export const ACCOUNT_ICONS: Record<string, IconType> = {
  checking: Wallet,
  savings: PiggyBank,
  credit: CreditCard,
  cash: Banknote,
  investment: TrendingUp,
};

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit: 'Credit card',
  cash: 'Cash',
  investment: 'Investment',
};

export const GOAL_ICONS: Record<string, IconType> = {
  target: Target,
  plane: Plane,
  shield: Shield,
  laptop: LaptopIcon,
  music: Music,
  home: Home,
  car: Car,
  gift: GiftIcon,
  coffee: Coffee,
  briefcase: Briefcase,
  globe: Globe,
  landmark: Landmark,
};

export function categoryMeta(id: string): CategoryMeta {
  return CATEGORY_MAP[id] || {
    id,
    label: id === 'transfer' ? 'Transfer' : id.replace(/-/g, ' '),
    color: '#8FA3BF',
    kind: 'expense',
  };
}

export const CURRENCIES = [
  { code: 'USD', label: 'US Dollar' },
  { code: 'EUR', label: 'Euro' },
  { code: 'GBP', label: 'British Pound' },
  { code: 'INR', label: 'Indian Rupee' },
  { code: 'CAD', label: 'Canadian Dollar' },
  { code: 'AUD', label: 'Australian Dollar' },
  { code: 'JPY', label: 'Japanese Yen' },
];
