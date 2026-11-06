import { Router } from 'express';
import { Goal } from '../models/Goal.js';
import { GoalContribution } from '../models/GoalContribution.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError, catchAsync } from '../lib/errors.js';
import { optionalString, parseAmount, parseISODate, requireString } from '../lib/validation.js';
import { goalsWithProgress } from '../lib/stats.js';
import { todayISO } from '../lib/dates.js';

const router = Router();
router.use(requireAuth);

const parseDeadline = (value) => {
  if (value == null || value === '') return null;
  return parseISODate(value, 'Target date');
};

const parseColor = (value, fallback = '#3EE8A7') => {
  if (value == null || value === '') return fallback;
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) throw new ApiError(400, 'Choose a valid color.');
  return value;
};

router.get(
  '/',
  catchAsync(async (req, res) => {
    const goals = await goalsWithProgress(req.user._id);
    const totalSaved = goals.reduce((sum, g) => sum + g.saved, 0);
    const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
    res.json({
      goals,
      summary: {
        count: goals.length,
        totalSaved,
        totalTarget,
        pct: totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 1000) / 10 : 0,
      },
    });
  })
);

router.post(
  '/',
  catchAsync(async (req, res) => {
    const goal = await Goal.create({
      user: req.user._id,
      name: requireString(req.body.name, 'Goal name', { min: 2, max: 60 }),
      targetAmount: parseAmount(req.body.targetAmount, 'Target amount'),
      deadline: parseDeadline(req.body.deadline),
      color: parseColor(req.body.color),
      icon: optionalString(req.body.icon, 20) || 'target',
    });

    const initialAmount = req.body.initialAmount ? parseAmount(req.body.initialAmount, 'Starting amount') : 0;
    if (initialAmount > 0) {
      await GoalContribution.create({
        user: req.user._id,
        goal: goal._id,
        amount: initialAmount,
        date: todayISO(),
        note: 'Starting balance',
      });
    }

    const goals = await goalsWithProgress(req.user._id);
    res.status(201).json({ goal: goals.find((g) => g.id === goal._id.toString()) });
  })
);

router.patch(
  '/:id',
  catchAsync(async (req, res) => {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) throw new ApiError(404, 'Goal not found.');

    if (req.body.name !== undefined) goal.name = requireString(req.body.name, 'Goal name', { min: 2, max: 60 });
    if (req.body.targetAmount !== undefined) goal.targetAmount = parseAmount(req.body.targetAmount, 'Target amount');
    if (req.body.deadline !== undefined) goal.deadline = parseDeadline(req.body.deadline);
    if (req.body.color !== undefined) goal.color = parseColor(req.body.color);
    if (req.body.icon !== undefined) goal.icon = optionalString(req.body.icon, 20) || 'target';

    await goal.save();
    const goals = await goalsWithProgress(req.user._id);
    res.json({ goal: goals.find((g) => g.id === goal._id.toString()) });
  })
);

router.delete(
  '/:id',
  catchAsync(async (req, res) => {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!goal) throw new ApiError(404, 'Goal not found.');
    await GoalContribution.deleteMany({ goal: goal._id, user: req.user._id });
    res.json({ ok: true });
  })
);

router.post(
  '/:id/contributions',
  catchAsync(async (req, res) => {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) throw new ApiError(404, 'Goal not found.');

    const contribution = await GoalContribution.create({
      user: req.user._id,
      goal: goal._id,
      amount: parseAmount(req.body.amount, 'Contribution amount'),
      date: req.body.date ? parseISODate(req.body.date) : todayISO(),
      note: optionalString(req.body.note, 120),
    });

    const goals = await goalsWithProgress(req.user._id);
    res.status(201).json({
      contribution: {
        id: contribution._id.toString(),
        amount: contribution.amount,
        date: contribution.date,
        note: contribution.note,
      },
      goal: goals.find((g) => g.id === goal._id.toString()),
    });
  })
);

router.delete(
  '/:id/contributions/:contributionId',
  catchAsync(async (req, res) => {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) throw new ApiError(404, 'Goal not found.');

    const result = await GoalContribution.findOneAndDelete({
      _id: req.params.contributionId,
      goal: goal._id,
      user: req.user._id,
    });
    if (!result) throw new ApiError(404, 'Contribution not found.');

    const goals = await goalsWithProgress(req.user._id);
    res.json({ goal: goals.find((g) => g.id === goal._id.toString()) });
  })
);

export default router;
