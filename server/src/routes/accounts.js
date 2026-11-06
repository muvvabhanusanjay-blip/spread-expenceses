import { Router } from 'express';
import { Account } from '../models/Account.js';
import { Transaction } from '../models/Transaction.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError, catchAsync } from '../lib/errors.js';
import { serializeAccount } from '../lib/serialize.js';
import { accountBalances, oid } from '../lib/stats.js';
import { optionalString, parseEnum, requireString } from '../lib/validation.js';
import { ACCOUNT_TYPES } from '../constants.js';
import { round2 } from '../lib/dates.js';

const router = Router();
router.use(requireAuth);

const parseColor = (value, fallback = '#7C8CF8') => {
  if (value == null || value === '') return fallback;
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) throw new ApiError(400, 'Choose a valid color.');
  return value;
};

const parseOpening = (value) => {
  const amount = round2(Number(value ?? 0));
  if (!Number.isFinite(amount) || Math.abs(amount) > 100000000) {
    throw new ApiError(400, 'Opening balance is invalid.');
  }
  return amount;
};

const parseLast4 = (value) => {
  const str = optionalString(value, 4);
  if (str && !/^\d{1,4}$/.test(str)) throw new ApiError(400, 'Last 4 digits must be numbers.');
  return str;
};

router.get(
  '/',
  catchAsync(async (req, res) => {
    const accounts = await accountBalances(req.user._id);
    const active = accounts.filter((a) => !a.isArchived);
    const assets = round2(active.filter((a) => a.balance > 0).reduce((sum, a) => sum + a.balance, 0));
    const liabilities = round2(Math.abs(active.filter((a) => a.balance < 0).reduce((sum, a) => sum + a.balance, 0)));

    res.json({
      accounts: accounts.map((a) => serializeAccount(a, {
        balance: a.balance,
        txCount: a.txCount,
        monthIn: a.monthIn,
        monthOut: a.monthOut,
      })),
      summary: {
        netWorth: round2(assets - liabilities),
        assets,
        liabilities,
        activeCount: active.length,
        archivedCount: accounts.length - active.length,
      },
    });
  })
);

router.post(
  '/',
  catchAsync(async (req, res) => {
    const account = await Account.create({
      user: req.user._id,
      name: requireString(req.body.name, 'Account name', { min: 2, max: 60 }),
      type: parseEnum(req.body.type, ACCOUNT_TYPES, 'Account type'),
      institution: optionalString(req.body.institution, 60),
      last4: parseLast4(req.body.last4),
      openingBalance: parseOpening(req.body.openingBalance),
      color: parseColor(req.body.color),
    });

    res.status(201).json({
      account: serializeAccount(account, { balance: account.openingBalance, txCount: 0, monthIn: 0, monthOut: 0 }),
    });
  })
);

router.patch(
  '/:id',
  catchAsync(async (req, res) => {
    const account = await Account.findOne({ _id: req.params.id, user: req.user._id });
    if (!account) throw new ApiError(404, 'Account not found.');

    if (req.body.name !== undefined) account.name = requireString(req.body.name, 'Account name', { min: 2, max: 60 });
    if (req.body.type !== undefined) account.type = parseEnum(req.body.type, ACCOUNT_TYPES, 'Account type');
    if (req.body.institution !== undefined) account.institution = optionalString(req.body.institution, 60);
    if (req.body.last4 !== undefined) account.last4 = parseLast4(req.body.last4);
    if (req.body.color !== undefined) account.color = parseColor(req.body.color);
    if (req.body.openingBalance !== undefined) account.openingBalance = parseOpening(req.body.openingBalance);
    if (req.body.isArchived !== undefined) account.isArchived = Boolean(req.body.isArchived);

    await account.save();

    const captured = (await accountBalances(req.user._id)).find((a) => a._id.toString() === account._id.toString());
    res.json({
      account: serializeAccount(account, captured
        ? { balance: captured.balance, txCount: captured.txCount, monthIn: captured.monthIn, monthOut: captured.monthOut }
        : {}),
    });
  })
);

router.delete(
  '/:id',
  catchAsync(async (req, res) => {
    const account = await Account.findOne({ _id: req.params.id, user: req.user._id });
    if (!account) throw new ApiError(404, 'Account not found.');

    const txCount = await Transaction.countDocuments({
      user: oid(req.user._id),
      $or: [{ account: account._id }, { toAccount: account._id }],
    });
    if (txCount > 0) {
      throw new ApiError(409, 'This account has transactions. Archive it instead of deleting it.');
    }

    await account.deleteOne();
    res.json({ ok: true });
  })
);

export default router;
