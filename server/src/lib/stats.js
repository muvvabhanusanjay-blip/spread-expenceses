import mongoose from 'mongoose';
import { Account } from '../models/Account.js';
import { Transaction } from '../models/Transaction.js';
import { Budget } from '../models/Budget.js';
import { Goal } from '../models/Goal.js';
import { GoalContribution } from '../models/GoalContribution.js';
import { CATEGORY_MAP } from '../constants.js';
import { monthBounds, monthLabel, monthRangeBack, round2, todayISO } from './dates.js';

export const oid = (id) => new mongoose.Types.ObjectId(String(id));

export async function accountBalances(userId) {
  const user = oid(userId);
  const accounts = await Account.find({ user }).sort({ createdAt: 1 }).lean();

  const [flows, transferIn, counts, transferCounts, monthFlows, monthTransferIn, monthTransferOut] = await Promise.all([
    Transaction.aggregate([
      { $match: { user } },
      { $group: { _id: { account: '$account', type: '$type' }, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { user, type: 'transfer', toAccount: { $ne: null } } },
      { $group: { _id: '$toAccount', total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { user } },
      { $group: { _id: '$account', count: { $sum: 1 } } },
    ]),
    Transaction.aggregate([
      { $match: { user, type: 'transfer', toAccount: { $ne: null } } },
      { $group: { _id: '$toAccount', count: { $sum: 1 } } },
    ]),
    Transaction.aggregate([
      {
        $match: {
          user,
          date: { $gte: monthBounds(todayISO().slice(0, 7)).start, $lte: monthBounds(todayISO().slice(0, 7)).end },
        },
      },
      { $group: { _id: { account: '$account', type: '$type' }, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      {
        $match: {
          user,
          type: 'transfer',
          toAccount: { $ne: null },
          date: { $gte: monthBounds(todayISO().slice(0, 7)).start, $lte: monthBounds(todayISO().slice(0, 7)).end },
        },
      },
      { $group: { _id: '$toAccount', total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      {
        $match: {
          user,
          type: 'transfer',
          date: { $gte: monthBounds(todayISO().slice(0, 7)).start, $lte: monthBounds(todayISO().slice(0, 7)).end },
        },
      },
      { $group: { _id: '$account', total: { $sum: '$amount' } } },
    ]),
  ]);

  const byId = new Map();
  for (const account of accounts) {
    byId.set(account._id.toString(), {
      ...account,
      balance: account.openingBalance,
      txCount: 0,
      monthIn: 0,
      monthOut: 0,
    });
  }

  for (const row of counts) {
    const target = byId.get(String(row._id));
    if (target) target.txCount = row.count;
  }
  for (const row of transferCounts) {
    const target = byId.get(String(row._id));
    if (target) target.txCount += row.count;
  }
  for (const row of flows) {
    const target = byId.get(String(row._id.account));
    if (!target) continue;
    if (row._id.type === 'income') target.balance += row.total;
    if (row._id.type === 'expense') target.balance -= row.total;
    if (row._id.type === 'transfer') target.balance -= row.total;
  }
  for (const row of transferIn) {
    const target = byId.get(String(row._id));
    if (target) target.balance += row.total;
  }
  for (const row of monthFlows) {
    const target = byId.get(String(row._id.account));
    if (!target) continue;
    if (row._id.type === 'income') target.monthIn += row.total;
    if (row._id.type === 'expense') target.monthOut += row.total;
  }
  for (const row of monthTransferIn) {
    const target = byId.get(String(row._id));
    if (target) target.monthIn += row.total;
  }
  for (const row of monthTransferOut) {
    const target = byId.get(String(row._id));
    if (target) target.monthOut += row.total;
  }

  return [...byId.values()].map((a) => ({
    ...a,
    balance: round2(a.balance),
    monthIn: round2(a.monthIn),
    monthOut: round2(a.monthOut),
  }));
}

export async function monthTotals(userId, start, end) {
  const rows = await Transaction.aggregate([
    { $match: { user: oid(userId), type: { $in: ['income', 'expense'] }, date: { $gte: start, $lte: end } } },
    { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  const totals = { income: 0, expense: 0, count: 0 };
  for (const row of rows) {
    totals[row._id] = round2(row.total);
    totals.count += row.count;
  }
  return totals;
}

export async function totalsByMonth(userId, startKey, endKey) {
  const rows = await Transaction.aggregate([
    {
      $match: {
        user: oid(userId),
        type: { $in: ['income', 'expense'] },
        date: { $gte: `${startKey}-01`, $lte: monthBounds(endKey).end },
      },
    },
    {
      $group: {
        _id: { month: { $substr: ['$date', 0, 7] }, type: '$type' },
        total: { $sum: '$amount' },
      },
    },
  ]);
  const map = new Map();
  for (const row of rows) {
    const entry = map.get(row._id.month) || { income: 0, expense: 0 };
    entry[row._id.type] = round2(row.total);
    map.set(row._id.month, entry);
  }
  return map;
}

export function cashflowSeries(endKey, count, totalsMap) {
  return monthRangeBack(endKey, count).map((key) => {
    const entry = totalsMap.get(key) || { income: 0, expense: 0 };
    return {
      key,
      label: monthLabel(key),
      income: round2(entry.income),
      expense: round2(entry.expense),
      net: round2(entry.income - entry.expense),
    };
  });
}

export async function expenseByCategory(userId, start, end, { limit = 0 } = {}) {
  const rows = await Transaction.aggregate([
    {
      $match: {
        user: oid(userId),
        type: 'expense',
        date: { $gte: start, $lte: end },
      },
    },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
    ...(limit ? [{ $limit: limit }] : []),
  ]);
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  return rows.map((row) => {
    const meta = CATEGORY_MAP[row._id] || { id: row._id, label: row._id, color: '#94A3B8' };
    return {
      id: row._id,
      label: meta.label,
      color: meta.color,
      amount: round2(row.total),
      count: row.count,
      pct: total > 0 ? round2((row.total / total) * 100) : 0,
    };
  });
}

export async function topMerchants(userId, start, end, limit = 6) {
  const rows = await Transaction.aggregate([
    {
      $match: {
        user: oid(userId),
        type: 'expense',
        date: { $gte: start, $lte: end },
        merchant: { $nin: ['', null] },
      },
    },
    { $group: { _id: '$merchant', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
    { $limit: limit },
  ]);
  return rows.map((row) => ({ name: row._id, amount: round2(row.total), count: row.count }));
}

export async function incomeByCategory(userId, start, end) {
  const rows = await Transaction.aggregate([
    { $match: { user: oid(userId), type: 'income', date: { $gte: start, $lte: end } } },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } },
  ]);
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  return rows.map((row) => {
    const meta = CATEGORY_MAP[row._id] || { label: row._id, color: '#94A3B8' };
    return {
      id: row._id,
      label: meta.label,
      color: meta.color,
      amount: round2(row.total),
      pct: total > 0 ? round2((row.total / total) * 100) : 0,
    };
  });
}

export async function dailySpend(userId, start, end) {
  const rows = await Transaction.aggregate([
    { $match: { user: oid(userId), type: 'expense', date: { $gte: start, $lte: end } } },
    { $group: { _id: '$date', total: { $sum: '$amount' } } },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((row) => ({ date: row._id, amount: round2(row.total) }));
}

export async function budgetsWithSpending(userId, monthKey) {
  const { start, end } = monthBounds(monthKey);
  const [budgets, spending] = await Promise.all([
    Budget.find({ user: oid(userId) }).lean(),
    Transaction.aggregate([
      { $match: { user: oid(userId), type: 'expense', date: { $gte: start, $lte: end } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
    ]),
  ]);
  const spentMap = new Map(spending.map((row) => [row._id, row.total]));
  return budgets
    .map((budget) => {
      const meta = CATEGORY_MAP[budget.category] || { label: budget.category, color: '#94A3B8' };
      const spent = round2(spentMap.get(budget.category) || 0);
      return {
        id: budget._id.toString(),
        category: budget.category,
        label: meta.label,
        color: meta.color,
        amount: round2(budget.amount),
        spent,
        remaining: round2(budget.amount - spent),
        pct: budget.amount > 0 ? round2((spent / budget.amount) * 100) : 0,
      };
    })
    .sort((a, b) => b.pct - a.pct);
}

export function budgetSummary(budgets) {
  const totalBudget = round2(budgets.reduce((sum, b) => sum + b.amount, 0));
  const totalSpent = round2(budgets.reduce((sum, b) => sum + b.spent, 0));
  return {
    totalBudget,
    totalSpent,
    remaining: round2(totalBudget - totalSpent),
    pct: totalBudget > 0 ? round2((totalSpent / totalBudget) * 100) : 0,
  };
}

const FREQUENCY_MONTHLY = { weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };

export function subscriptionMonthlyAmount(subscription) {
  return round2(subscription.amount * (FREQUENCY_MONTHLY[subscription.frequency] || 1));
}

export function serializeSubscription(subscription) {
  return {
    id: subscription._id.toString(),
    name: subscription.name,
    amount: round2(subscription.amount),
    category: subscription.category,
    frequency: subscription.frequency,
    nextDate: subscription.nextDate,
    active: Boolean(subscription.active),
    notes: subscription.notes || '',
    account: subscription.account
      ? {
          id: subscription.account._id.toString(),
          name: subscription.account.name,
          color: subscription.account.color,
        }
      : null,
    monthlyAmount: subscriptionMonthlyAmount(subscription),
  };
}

export async function goalsWithProgress(userId) {
  const user = oid(userId);
  const goals = await Goal.find({ user }).sort({ createdAt: 1 }).lean();
  if (!goals.length) return [];

  const [sums, contributions] = await Promise.all([
    GoalContribution.aggregate([
      { $match: { user } },
      { $group: { _id: '$goal', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    GoalContribution.find({ user }).sort({ date: -1, createdAt: -1 }).limit(60).lean(),
  ]);

  const sumMap = new Map(sums.map((row) => [String(row._id), row]));
  const contribMap = new Map();
  for (const contribution of contributions) {
    const key = String(contribution.goal);
    if (!contribMap.has(key)) contribMap.set(key, []);
    if (contribMap.get(key).length < 5) {
      contribMap.get(key).push({
        id: contribution._id.toString(),
        amount: round2(contribution.amount),
        date: contribution.date,
        note: contribution.note || '',
      });
    }
  }

  const today = todayISO();
  return goals.map((goal) => {
    const sum = sumMap.get(goal._id.toString());
    const saved = round2(sum?.total || 0);
    const remaining = Math.max(0, round2(goal.targetAmount - saved));
    const daysLeft = goal.deadline
      ? Math.round((new Date(`${goal.deadline}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86400000)
      : null;
    let monthlyNeeded = 0;
    if (daysLeft != null && daysLeft > 0 && remaining > 0) {
      monthlyNeeded = round2(remaining / Math.max(1, Math.ceil(daysLeft / 30)));
    }
    return {
      id: goal._id.toString(),
      name: goal.name,
      targetAmount: round2(goal.targetAmount),
      deadline: goal.deadline || null,
      color: goal.color,
      icon: goal.icon,
      saved,
      remaining,
      contributions: contribMap.get(goal._id.toString()) || [],
      contributionCount: sum?.count || 0,
      pct: goal.targetAmount > 0 ? round2((saved / goal.targetAmount) * 100) : 0,
      daysLeft,
      monthlyNeeded,
    };
  });
}

export function pctChange(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return round2(((current - previous) / previous) * 100);
}

export async function weekdayPattern(userId, start, end) {
  const rows = await Transaction.aggregate([
    { $match: { user: oid(userId), type: 'expense', date: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: { $dayOfWeek: { $dateFromString: { dateString: '$date' } } },
        total: { $sum: '$amount' },
      },
    },
  ]);
  const totals = new Map(rows.map((row) => [row._id, row.total]));
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return [2, 3, 4, 5, 6, 7, 1].map((dow) => ({
    day: labels[dow - 1],
    amount: round2(totals.get(dow) || 0),
  }));
}
