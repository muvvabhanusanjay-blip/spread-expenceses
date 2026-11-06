import { Router } from 'express';
import { Subscription } from '../models/Subscription.js';
import { Account } from '../models/Account.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError, catchAsync } from '../lib/errors.js';
import { optionalString, parseAmount, parseExpenseCategory, parseEnum, parseISODate, requireString } from '../lib/validation.js';
import { serializeSubscription, subscriptionMonthlyAmount } from '../lib/stats.js';
import { FREQUENCIES } from '../constants.js';
import { daysUntil, round2, todayISO } from '../lib/dates.js';

const router = Router();
router.use(requireAuth);

async function optionalAccount(userId, accountId) {
  if (!accountId) return null;
  const account = await Account.findOne({ _id: accountId, user: userId });
  if (!account) throw new ApiError(400, 'Choose a valid account.');
  return account;
}

function decorate(subscription) {
  const base = serializeSubscription(subscription);
  return { ...base, daysUntil: daysUntil(base.nextDate) };
}

router.get(
  '/',
  catchAsync(async (req, res) => {
    const subscriptions = await Subscription.find({ user: req.user._id })
      .sort({ active: -1, nextDate: 1 })
      .populate('account', 'name color')
      .lean();

    const items = subscriptions.map(decorate);
    const active = items.filter((s) => s.active);
    const monthlyTotal = round2(active.reduce((sum, s) => sum + subscriptionMonthlyAmount(s), 0));

    res.json({
      items,
      summary: {
        activeCount: active.length,
        monthlyTotal,
        yearlyTotal: round2(monthlyTotal * 12),
        dueThisWeek: active.filter((s) => s.daysUntil >= 0 && s.daysUntil <= 7).length,
        dueThisMonth: active.filter((s) => s.daysUntil >= 0 && s.daysUntil <= 30).length,
      },
    });
  })
);

router.post(
  '/',
  catchAsync(async (req, res) => {
    const account = await optionalAccount(req.user._id, req.body.account);

    const subscription = await Subscription.create({
      user: req.user._id,
      name: requireString(req.body.name, 'Name', { min: 2, max: 60 }),
      amount: parseAmount(req.body.amount, 'Amount'),
      category: req.body.category ? parseExpenseCategory(req.body.category) : 'subscriptions',
      account: account?._id || null,
      frequency: parseEnum(req.body.frequency, FREQUENCIES, 'Billing cycle', 'monthly'),
      nextDate: req.body.nextDate ? parseISODate(req.body.nextDate, 'Next charge date') : todayISO(),
      active: req.body.active !== undefined ? Boolean(req.body.active) : true,
      notes: optionalString(req.body.notes, 120),
    });

    await subscription.populate('account', 'name color');
    res.status(201).json({ subscription: decorate(subscription.toObject()) });
  })
);

router.patch(
  '/:id',
  catchAsync(async (req, res) => {
    const subscription = await Subscription.findOne({ _id: req.params.id, user: req.user._id });
    if (!subscription) throw new ApiError(404, 'Subscription not found.');

    if (req.body.name !== undefined) subscription.name = requireString(req.body.name, 'Name', { min: 2, max: 60 });
    if (req.body.amount !== undefined) subscription.amount = parseAmount(req.body.amount, 'Amount');
    if (req.body.category !== undefined) subscription.category = parseExpenseCategory(req.body.category);
    if (req.body.account !== undefined) {
      const account = await optionalAccount(req.user._id, req.body.account);
      subscription.account = account?._id || null;
    }
    if (req.body.frequency !== undefined) subscription.frequency = parseEnum(req.body.frequency, FREQUENCIES, 'Billing cycle');
    if (req.body.nextDate !== undefined) subscription.nextDate = parseISODate(req.body.nextDate, 'Next charge date');
    if (req.body.active !== undefined) subscription.active = Boolean(req.body.active);
    if (req.body.notes !== undefined) subscription.notes = optionalString(req.body.notes, 120);

    await subscription.save();
    await subscription.populate('account', 'name color');
    res.json({ subscription: decorate(subscription.toObject()) });
  })
);

router.delete(
  '/:id',
  catchAsync(async (req, res) => {
    const subscription = await Subscription.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!subscription) throw new ApiError(404, 'Subscription not found.');
    res.json({ ok: true });
  })
);

export default router;
