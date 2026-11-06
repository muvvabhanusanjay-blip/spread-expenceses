import { Router } from 'express';
import mongoose from 'mongoose';
import { Account } from '../models/Account.js';
import { Transaction } from '../models/Transaction.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError, catchAsync } from '../lib/errors.js';
import { serializeTransaction } from '../lib/serialize.js';
import { monthBounds, round2, todayISO } from '../lib/dates.js';
import {
  optionalString,
  parseAmount,
  parseCategoryForType,
  parseEnum,
  parseISODate,
  parseTags,
} from '../lib/validation.js';
import { CATEGORY_MAP } from '../constants.js';

const router = Router();
router.use(requireAuth);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildFilter(userId, query) {
  const filter = { user: userId };
  const and = [];

  if (query.month && query.month !== 'all') {
    const { start, end } = monthBounds(query.month);
    filter.date = { $gte: start, $lte: end };
  } else if (query.from || query.to) {
    filter.date = {};
    if (query.from) filter.date.$gte = query.from;
    if (query.to) filter.date.$lte = query.to;
  }

  if (query.type && query.type !== 'all') filter.type = query.type;
  if (query.category && query.category !== 'all') filter.category = query.category;
  if (query.account && query.account !== 'all') {
    if (!mongoose.isValidObjectId(query.account)) throw new ApiError(400, 'Invalid account filter.');
    filter.account = new mongoose.Types.ObjectId(query.account);
  }

  const search = typeof query.q === 'string' ? query.q.trim() : '';
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    and.push({ $or: [{ merchant: rx }, { note: rx }, { tags: rx }] });
  }
  if (and.length) filter.$and = and;
  return filter;
}

function sortFor(value) {
  switch (value) {
    case 'date_asc':
      return { date: 1, createdAt: 1 };
    case 'amount_desc':
      return { amount: -1, date: -1 };
    case 'amount_asc':
      return { amount: 1, date: -1 };
    default:
      return { date: -1, createdAt: -1 };
  }
}

async function summaryFor(userId, query) {
  const rows = await Transaction.aggregate([
    { $match: buildFilter(userId, query) },
    { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  const summary = { income: 0, expense: 0, net: 0, count: 0 };
  for (const row of rows) {
    if (row._id === 'income') summary.income = round2(row.total);
    if (row._id === 'expense') summary.expense = round2(row.total);
    summary.count += row.count;
  }
  summary.net = round2(summary.income - summary.expense);
  return summary;
}

async function ensureAccount(userId, accountId) {
  if (!accountId) throw new ApiError(400, 'Choose an account.');
  const account = await Account.findOne({ _id: accountId, user: userId, isArchived: false });
  if (!account) throw new ApiError(400, 'Choose a valid, active account.');
  return account;
}

router.get(
  '/export',
  catchAsync(async (req, res) => {
    const transactions = await Transaction.find(buildFilter(req.user._id, req.query))
      .sort(sortFor(req.query.sort))
      .populate('account', 'name')
      .populate('toAccount', 'name')
      .lean();

    const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const header = ['Date', 'Type', 'Category', 'Merchant', 'Account', 'To account', 'Amount', 'Note', 'Tags'];
    const lines = [header.map(escape).join(',')];
    for (const tx of transactions) {
      lines.push([
        tx.date,
        tx.type,
        CATEGORY_MAP[tx.category]?.label || tx.category,
        tx.merchant,
        tx.account?.name || '',
        tx.toAccount?.name || '',
        tx.amount.toFixed(2),
        tx.note,
        (tx.tags || []).join(' '),
      ].map(escape).join(','));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="spendwise-transactions-${todayISO()}.csv"`);
    res.send(lines.join('\r\n'));
  })
);

router.get(
  '/',
  catchAsync(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(5, Number(req.query.limit) || 25));
    const filter = buildFilter(req.user._id, req.query);

    const [items, total, summary] = await Promise.all([
      Transaction.find(filter)
        .sort(sortFor(req.query.sort))
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('account', 'name type last4 color')
        .populate('toAccount', 'name type last4 color')
        .lean(),
      Transaction.countDocuments(filter),
      summaryFor(req.user._id, req.query),
    ]);

    res.json({
      items: items.map(serializeTransaction),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      summary,
    });
  })
);

router.post(
  '/',
  catchAsync(async (req, res) => {
    const body = req.body;
    const type = parseEnum(body.type, ['income', 'expense', 'transfer'], 'Transaction type');
    const amount = parseAmount(body.amount);
    const date = body.date ? parseISODate(body.date) : todayISO();
    const account = await ensureAccount(req.user._id, body.account);
    const category = parseCategoryForType(body.category, type);

    let toAccount = null;
    if (type === 'transfer') {
      if (!body.toAccount) throw new ApiError(400, 'Choose where the money is going.');
      if (String(body.toAccount) === String(account._id)) {
        throw new ApiError(400, 'Choose two different accounts for a transfer.');
      }
      toAccount = await ensureAccount(req.user._id, body.toAccount);
    }

    let merchant = optionalString(body.merchant, 80);
    if (!merchant) merchant = type === 'transfer' ? `Transfer to ${toAccount.name}` : CATEGORY_MAP[category].label;

    const transaction = await Transaction.create({
      user: req.user._id,
      account: account._id,
      toAccount: toAccount?._id || null,
      type,
      amount,
      category,
      merchant,
      note: optionalString(body.note, 240),
      date,
      tags: parseTags(body.tags),
    });

    await transaction.populate([
      { path: 'account', select: 'name type last4 color' },
      { path: 'toAccount', select: 'name type last4 color' },
    ]);

    res.status(201).json({ transaction: serializeTransaction(transaction) });
  })
);

router.patch(
  '/:id',
  catchAsync(async (req, res) => {
    const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
    if (!transaction) throw new ApiError(404, 'Transaction not found.');

    const body = req.body;
    const type = body.type !== undefined
      ? parseEnum(body.type, ['income', 'expense', 'transfer'], 'Transaction type')
      : transaction.type;
    const category = parseCategoryForType(body.category ?? transaction.category, type);

    const account = body.account !== undefined
      ? await ensureAccount(req.user._id, body.account)
      : await Account.findOne({ _id: transaction.account, user: req.user._id });
    if (!account) throw new ApiError(400, 'Choose a valid account.');

    let toAccount = null;
    if (type === 'transfer') {
      const target = body.toAccount !== undefined ? body.toAccount : transaction.toAccount;
      if (!target) throw new ApiError(400, 'Choose where the money is going.');
      if (String(target) === String(account._id)) {
        throw new ApiError(400, 'Choose two different accounts for a transfer.');
      }
      toAccount = await ensureAccount(req.user._id, target);
    }

    transaction.type = type;
    transaction.category = category;
    transaction.account = account._id;
    transaction.toAccount = toAccount?._id || null;
    if (body.amount !== undefined) transaction.amount = parseAmount(body.amount);
    if (body.date !== undefined) transaction.date = parseISODate(body.date);
    if (body.merchant !== undefined) {
      transaction.merchant = optionalString(body.merchant, 80) || (type === 'transfer' ? 'Transfer' : CATEGORY_MAP[category].label);
    }
    if (body.note !== undefined) transaction.note = optionalString(body.note, 240);
    if (body.tags !== undefined) transaction.tags = parseTags(body.tags);

    await transaction.save();
    await transaction.populate([
      { path: 'account', select: 'name type last4 color' },
      { path: 'toAccount', select: 'name type last4 color' },
    ]);

    res.json({ transaction: serializeTransaction(transaction) });
  })
);

router.delete(
  '/:id',
  catchAsync(async (req, res) => {
    const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!transaction) throw new ApiError(404, 'Transaction not found.');
    res.json({ ok: true });
  })
);

export default router;
