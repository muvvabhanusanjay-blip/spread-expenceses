import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { catchAsync } from '../lib/errors.js';
import {
  accountBalances,
  cashflowSeries,
  dailySpend,
  expenseByCategory,
  incomeByCategory,
  monthTotals,
  pctChange,
  topMerchants,
  totalsByMonth,
  weekdayPattern,
} from '../lib/stats.js';
import { monthBounds, monthLabel, monthKeyOf, monthRangeBack, round2, shiftMonth } from '../lib/dates.js';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  catchAsync(async (req, res) => {
    const months = Math.min(12, Math.max(3, Number(req.query.months) || 6));
    const endKey = monthKeyOf();
    const keys = monthRangeBack(endKey, months);
    const start = `${keys[0]}-01`;
    const end = monthBounds(endKey).end;

    const prevKeys = monthRangeBack(shiftMonth(keys[0], -1), months);
    const prevStart = `${prevKeys[0]}-01`;
    const prevEnd = monthBounds(prevKeys[prevKeys.length - 1]).end;

    const [totalsMap, totals, prevTotals, currentCats, prevCats, merchants, incomeSources, daily, weekday, accounts] =
      await Promise.all([
        totalsByMonth(req.user._id, keys[0], endKey),
        monthTotals(req.user._id, start, end),
        monthTotals(req.user._id, prevStart, prevEnd),
        expenseByCategory(req.user._id, start, end),
        expenseByCategory(req.user._id, prevStart, prevEnd),
        topMerchants(req.user._id, start, end, 8),
        incomeByCategory(req.user._id, start, end),
        dailySpend(req.user._id, start, end),
        weekdayPattern(req.user._id, start, end),
        accountBalances(req.user._id),
      ]);

    const cashflow = cashflowSeries(endKey, months, totalsMap);
    const categoryMap = new Map();
    for (const cat of currentCats) categoryMap.set(cat.id, { ...cat, prevAmount: 0 });
    for (const cat of prevCats) {
      const existing = categoryMap.get(cat.id);
      if (existing) existing.prevAmount = cat.amount;
      else categoryMap.set(cat.id, { ...cat, amount: 0, count: 0, pct: 0, prevAmount: cat.amount });
    }
    const categories = [...categoryMap.values()]
      .map((cat) => ({
        ...cat,
        changePct: cat.prevAmount > 0 ? pctChange(cat.amount, cat.prevAmount) : cat.amount > 0 ? 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const activeAccounts = accounts.filter((a) => !a.isArchived);
    const assets = round2(activeAccounts.filter((a) => a.balance > 0).reduce((s, a) => s + a.balance, 0));
    const liabilities = round2(Math.abs(activeAccounts.filter((a) => a.balance < 0).reduce((s, a) => s + a.balance, 0)));
    const accountItems = activeAccounts
      .map((a) => ({
        id: a._id.toString(),
        name: a.name,
        type: a.type,
        color: a.color,
        last4: a.last4,
        balance: a.balance,
        pct: a.balance > 0 && assets > 0 ? round2((a.balance / assets) * 100) : 0,
      }))
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

    const bestMonth = [...cashflow].sort((a, b) => b.net - a.net)[0];
    const spendiestMonth = [...cashflow].sort((a, b) => b.expense - a.expense)[0];
    const peakWeekday = [...weekday].sort((a, b) => b.amount - a.amount)[0];
    const rangeDays = Math.max(1, Math.round((new Date(`${end}T12:00:00`) - new Date(`${start}T12:00:00`)) / 86400000) + 1);
    const avgDaily = round2(totals.expense / rangeDays);

    res.json({
      months,
      endMonth: endKey,
      range: {
        from: start,
        to: end,
        label: `${monthLabel(keys[0], 'short')} – ${monthLabel(endKey, 'short')}`,
        count: months,
      },
      summary: {
        totalIncome: totals.income,
        totalExpense: totals.expense,
        net: round2(totals.income - totals.expense),
        savingsRate: totals.income > 0 ? round2(((totals.income - totals.expense) / totals.income) * 100) : 0,
        avgIncome: round2(totals.income / months),
        avgExpense: round2(totals.expense / months),
        avgDaily: round2(avgDaily),
        transactionCount: totals.count,
        incomeChange: pctChange(totals.income, prevTotals.income),
        expenseChange: pctChange(totals.expense, prevTotals.expense),
        topCategory: categories[0] || null,
        topMerchant: merchants[0] || null,
        bestMonth: bestMonth || null,
        spendiestMonth: spendiestMonth || null,
        peakWeekday: peakWeekday || null,
        incomeSources,
        accounts: accountItems,
        assets,
        liabilities,
        netWorth: round2(assets - liabilities),
      },
      cashflow,
      categories,
      merchants,
      dailySpend: daily,
      weekday,
      hasPreviousData: prevCats.length > 0,
    });
  })
);

export default router;
