import { Router } from 'express';
import { Budget } from '../models/Budget.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError, catchAsync } from '../lib/errors.js';
import { parseAmount, parseExpenseCategory, parseMonth } from '../lib/validation.js';
import { budgetSummary, budgetsWithSpending } from '../lib/stats.js';
import { CATEGORY_MAP } from '../constants.js';
import { monthBounds, monthLabel, todayISO } from '../lib/dates.js';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  catchAsync(async (req, res) => {
    const month = parseMonth(req.query.month, todayISO().slice(0, 7));
    const budgets = await budgetsWithSpending(req.user._id, month);
    const isCurrentMonth = month === todayISO().slice(0, 7);
    res.json({
      month,
      monthLabel: monthLabel(month, 'long'),
      daysLeft: isCurrentMonth ? Math.max(0, monthBounds(month).days - Number(todayISO().slice(8, 10))) : 0,
      isCurrentMonth,
      budgets,
      summary: budgetSummary(budgets),
    });
  })
);

router.post(
  '/',
  catchAsync(async (req, res) => {
    const category = parseExpenseCategory(req.body.category);
    const amount = parseAmount(req.body.amount, 'Budget amount');

    const existing = await Budget.findOne({ user: req.user._id, category });
    if (existing) {
      throw new ApiError(409, `You already have a ${CATEGORY_MAP[category].label} budget. Edit it instead.`);
    }

    const budget = await Budget.create({ user: req.user._id, category, amount });
    res.status(201).json({
      budget: {
        id: budget._id.toString(),
        category,
        label: CATEGORY_MAP[category].label,
        color: CATEGORY_MAP[category].color,
        amount,
        spent: 0,
        remaining: amount,
        pct: 0,
      },
    });
  })
);

router.patch(
  '/:id',
  catchAsync(async (req, res) => {
    const amount = parseAmount(req.body.amount, 'Budget amount');
    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { amount },
      { new: true }
    );
    if (!budget) throw new ApiError(404, 'Budget not found.');

    const budgets = await budgetsWithSpending(req.user._id, todayISO().slice(0, 7));
    const updated = budgets.find((b) => b.id === budget._id.toString());
    res.json({ budget: updated || { id: budget._id.toString(), category: budget.category, amount } });
  })
);

router.delete(
  '/:id',
  catchAsync(async (req, res) => {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!budget) throw new ApiError(404, 'Budget not found.');
    res.json({ ok: true });
  })
);

export default router;
