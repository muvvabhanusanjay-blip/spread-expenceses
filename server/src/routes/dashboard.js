import { Router } from 'express';
import { Transaction } from '../models/Transaction.js';
import { Subscription } from '../models/Subscription.js';
import { requireAuth } from '../middleware/auth.js';
import { catchAsync } from '../lib/errors.js';
import { serializeTransaction } from '../lib/serialize.js';
import {
  accountBalances,
  budgetSummary,
  budgetsWithSpending,
  cashflowSeries,
  dailySpend,
  expenseByCategory,
  goalsWithProgress,
  monthTotals,
  serializeSubscription,
  topMerchants,
  totalsByMonth,
} from '../lib/stats.js';
import {
  daysUntil,
  monthBounds,
  monthKeyOf,
  monthLabel,
  shiftMonth,
  todayISO,
  round2,
} from '../lib/dates.js';
import { parseMonth } from '../lib/validation.js';

const router = Router();
router.use(requireAuth);

const money = (amount, currency) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

router.get(
  '/',
  catchAsync(async (req, res) => {
    const month = parseMonth(req.query.month, monthKeyOf());
    const prevMonth = shiftMonth(month, -1);
    const bounds = monthBounds(month);
    const prevBounds = monthBounds(prevMonth);
    const user = req.user;
    const today = todayISO();

    const [
      accounts,
      currentTotals,
      prevTotals,
      monthlyTotals,
      categories,
      prevCategories,
      budgets,
      goals,
      recent,
      activeSubs,
      daily,
    ] = await Promise.all([
      accountBalances(user._id),
      monthTotals(user._id, bounds.start, bounds.end),
      monthTotals(user._id, prevBounds.start, prevBounds.end),
      totalsByMonth(user._id, shiftMonth(month, -5), month),
      expenseByCategory(user._id, bounds.start, bounds.end),
      expenseByCategory(user._id, prevBounds.start, prevBounds.end),
      budgetsWithSpending(user._id, month),
      goalsWithProgress(user._id),
      Transaction.find({ user: user._id })
        .sort({ date: -1, createdAt: -1 })
        .limit(7)
        .populate('account', 'name type last4 color')
        .populate('toAccount', 'name type last4 color')
        .lean(),
      Subscription.find({ user: user._id, active: true })
        .sort({ nextDate: 1 })
        .limit(6)
        .populate('account', 'name color')
        .lean(),
      dailySpend(user._id, bounds.start, bounds.end),
    ]);

    const activeAccounts = accounts.filter((a) => !a.isArchived);
    const assets = round2(activeAccounts.filter((a) => a.balance > 0).reduce((sum, a) => sum + a.balance, 0));
    const liabilities = round2(Math.abs(activeAccounts.filter((a) => a.balance < 0).reduce((sum, a) => sum + a.balance, 0)));
    const netWorth = round2(assets - liabilities);
    const netFlow = round2(currentTotals.income - currentTotals.expense);
    const savingsRate = currentTotals.income > 0
      ? round2((netFlow / currentTotals.income) * 100)
      : 0;
    const bSummary = budgetSummary(budgets);
    const goalSummary = {
      saved: round2(goals.reduce((sum, g) => sum + g.saved, 0)),
      target: round2(goals.reduce((sum, g) => sum + g.targetAmount, 0)),
    };

    const upcoming = activeSubs.map((sub) => ({
      ...serializeSubscription(sub),
      daysUntil: daysUntil(sub.nextDate),
    }));

    const insights = [];
    const topMerchantRows = await topMerchants(user._id, bounds.start, bounds.end, 1);

    if (!currentTotals.count && !goals.length && !budgets.length) {
      insights.push({
        kind: 'onboarding',
        tone: 'neutral',
        title: 'Your workspace is ready',
        message: 'Add your first transaction or set a budget — personalised insights will appear here.',
      });
    } else {
      const overspent = budgets.filter((b) => b.pct > 100);
      if (overspent.length) {
        insights.push({
          kind: 'budget',
          tone: 'warning',
          title: `${overspent.length} budget${overspent.length > 1 ? 's' : ''} over limit`,
          message: `${overspent.slice(0, 3).map((b) => b.label).join(', ')} went past ${money(overspent.reduce((s, b) => s + (b.spent - b.amount), 0), user.currency)} over budget.`,
        });
      }

      const topCategory = categories[0];
      const prevTop = prevCategories.find((c) => c.id === topCategory?.id);
      if (topCategory) {
        const change = prevTop && prevTop.amount > 0
          ? round2(((topCategory.amount - prevTop.amount) / prevTop.amount) * 100)
          : null;
        if (change !== null && Math.abs(change) >= 5) {
          insights.push({
            kind: 'trend',
            tone: change > 0 ? 'warning' : 'positive',
            title: `${topCategory.label} ${change > 0 ? 'up' : 'down'} ${Math.abs(Math.round(change))}%`,
            message: `${money(topCategory.amount, user.currency)} spent this month, ${Math.round(topCategory.pct)}% of all spending.`,
          });
        } else {
          insights.push({
            kind: 'trend',
            tone: 'neutral',
            title: `${topCategory.label} leads your spending`,
            message: `${money(topCategory.amount, user.currency)} so far this month across ${topCategory.count} transaction${topCategory.count === 1 ? '' : 's'}.`,
          });
        }
      }

      if (currentTotals.income > 0) {
        insights.push({
          kind: 'savings',
          tone: savingsRate >= 15 ? 'positive' : savingsRate < 0 ? 'warning' : 'neutral',
          title: savingsRate >= 0 ? `You kept ${Math.round(savingsRate)}% of income` : 'Spending outpaced income',
          message: savingsRate >= 0
            ? `${money(netFlow, user.currency)} left after expenses. ${savingsRate >= 20 ? 'Strong pace — keep it up.' : 'Aim for 20% to build momentum.'}`
            : `${money(Math.abs(netFlow), user.currency)} more went out than came in this month.`,
        });
      }

      const dueSoon = upcoming.filter((s) => s.daysUntil >= 0 && s.daysUntil <= 7);
      if (dueSoon.length) {
        insights.push({
          kind: 'bills',
          tone: 'neutral',
          title: `${dueSoon.length} bill${dueSoon.length > 1 ? 's' : ''} due this week`,
          message: `${money(dueSoon.reduce((s, b) => s + b.amount, 0), user.currency)} in upcoming charges, starting with ${dueSoon[0].name}.`,
        });
      }
    }

    res.json({
      month,
      monthLabel: monthLabel(month, 'long'),
      today,
      summary: {
        netWorth,
        assets,
        liabilities,
        netFlow,
        income: currentTotals.income,
        expense: currentTotals.expense,
        transactionCount: currentTotals.count,
        savingsRate,
        incomeChange: prevTotals.income ? round2(((currentTotals.income - prevTotals.income) / prevTotals.income) * 100) : 0,
        expenseChange: prevTotals.expense ? round2(((currentTotals.expense - prevTotals.expense) / prevTotals.expense) * 100) : 0,
        budgetPct: bSummary.pct,
        goalsSaved: goalSummary.saved,
        goalsTarget: goalSummary.target,
      },
      accounts: activeAccounts.map((a) => ({
        id: a._id.toString(),
        name: a.name,
        type: a.type,
        last4: a.last4,
        color: a.color,
        balance: a.balance,
      })),
      cashflow: cashflowSeries(month, 6, monthlyTotals),
      categories,
      budgets,
      budgetSummary: bSummary,
      goals,
      recent: recent.map(serializeTransaction),
      upcoming,
      dailySpend: daily,
      insights: insights.slice(0, 4),
      topMerchant: topMerchantRows[0] || null,
    });
  })
);

export default router;
