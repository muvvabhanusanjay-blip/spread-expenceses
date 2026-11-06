import bcrypt from 'bcryptjs';
import { config } from './config.js';
import { User } from './models/User.js';
import { Account } from './models/Account.js';
import { Transaction } from './models/Transaction.js';
import { Budget } from './models/Budget.js';
import { Goal } from './models/Goal.js';
import { GoalContribution } from './models/GoalContribution.js';
import { Subscription } from './models/Subscription.js';
import { addMonthsToISO, monthBounds, monthKeyOf, shiftMonth, todayISO, round2 } from './lib/dates.js';

const pad = (n) => String(n).padStart(2, '0');

function mulberry32(seed) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function seedDemo({ force = false } = {}) {
  let user = await User.findOne({ email: config.demoEmail });
  if (user && !force) return user;

  if (!user) {
    user = await User.create({
      name: 'Aarav Mehta',
      email: config.demoEmail,
      passwordHash: await bcrypt.hash(config.demoPassword, 10),
      currency: 'USD',
      isDemo: true,
    });
  }

  await Promise.all([
    Transaction.deleteMany({ user: user._id }),
    Account.deleteMany({ user: user._id }),
    Budget.deleteMany({ user: user._id }),
    Goal.deleteMany({ user: user._id }),
    GoalContribution.deleteMany({ user: user._id }),
    Subscription.deleteMany({ user: user._id }),
  ]);

  const [checking, savings, credit, cash, investment] = await Account.create([
    {
      user: user._id, name: 'Everyday Checking', type: 'checking', institution: 'Meridian Bank',
      last4: '4821', openingBalance: 2400, color: '#7C8CF8',
    },
    {
      user: user._id, name: 'High-Yield Savings', type: 'savings', institution: 'Meridian Bank',
      last4: '9930', openingBalance: 14200, color: '#3EE8A7',
    },
    {
      user: user._id, name: 'Aurora Credit', type: 'credit', institution: 'Aurora Card',
      last4: '2277', openingBalance: -840, color: '#F472B6',
    },
    {
      user: user._id, name: 'Cash Wallet', type: 'cash', institution: '',
      last4: '', openingBalance: 380, color: '#FBBF24',
    },
    {
      user: user._id, name: 'Growth Portfolio', type: 'investment', institution: 'Vanguard',
      last4: '6642', openingBalance: 14800, color: '#38BDF8',
    },
  ]);

  const random = mulberry32(20261106);
  const pick = (arr) => arr[Math.floor(random() * arr.length)];
  const between = (min, max) => round2(min + random() * (max - min));
  const int = (min, max) => Math.floor(random() * (max - min + 1)) + min;

  const today = todayISO();
  const todayDay = Number(today.slice(8, 10));
  const currentMonth = monthKeyOf();
  const transactions = [];

  const addTx = (key, day, { type, amount, category, merchant, account, toAccount = null, note = '', tags = [] }) => {
    const maxDay = key === currentMonth ? todayDay : monthBounds(key).days;
    if (day > maxDay) return;
    transactions.push({
      user: user._id,
      account: account._id,
      toAccount: toAccount?._id || null,
      type,
      amount: round2(amount),
      category,
      merchant,
      note,
      tags,
      date: `${key}-${pad(Math.min(day, monthBounds(key).days))}`,
    });
  };

  const diningSpots = [
    ['Blue Bottle Coffee', 8, 16], ['Sweetgreen', 14, 26], ['Sushi Kaido', 38, 74],
    ['DoorDash', 22, 49], ['Starbucks', 6, 14], ['The Roastery', 17, 36],
    ['Taco Loco', 12, 29], ['Nobu Downtown', 64, 128],
  ];
  const groceryStores = ['Whole Foods Market', 'Trader Joe\'s', 'Safeway', 'Costco Wholesale', 'Green Basket'];
  const transportSpots = [['Uber', 9, 32], ['Lyft', 8, 28], ['Shell', 38, 72], ['Metro Transit', 3, 9]];
  const shoppingSpots = [
    ['Amazon', 24, 168], ['Uniqlo', 35, 124], ['Nike', 54, 189], ['Target', 20, 96], ['Apple Store', 89, 349],
  ];

  for (let offset = -24; offset <= 0; offset += 1) {
    const key = shiftMonth(currentMonth, offset);

    addTx(key, 1, { type: 'income', amount: 3100, category: 'salary', merchant: 'Northwind Labs', account: checking, note: 'Semi-monthly salary', tags: ['income'] });
    addTx(key, 15, { type: 'income', amount: 3100, category: 'salary', merchant: 'Northwind Labs', account: checking, note: 'Semi-monthly salary', tags: ['income'] });
    addTx(key, 2, { type: 'expense', amount: 1850, category: 'housing', merchant: 'Oakline Residency', account: checking, note: 'Monthly rent', tags: ['essential'] });
    addTx(key, 5, { type: 'expense', amount: between(74, 128), category: 'utilities', merchant: 'City Power & Light', account: checking, tags: ['essential'] });
    addTx(key, 6, { type: 'expense', amount: 65, category: 'utilities', merchant: 'Fiberline Internet', account: checking });
    addTx(key, 10, { type: 'expense', amount: 145, category: 'insurance', merchant: 'Statewide Insurance', account: checking, note: 'Renters + auto bundle' });

    addTx(key, 3, { type: 'expense', amount: 15.49, category: 'subscriptions', merchant: 'Netflix', account: credit, tags: ['subscription'] });
    addTx(key, 8, { type: 'expense', amount: 11.99, category: 'subscriptions', merchant: 'Spotify', account: credit, tags: ['subscription'] });
    addTx(key, 11, { type: 'expense', amount: 2.99, category: 'subscriptions', merchant: 'iCloud+', account: credit, tags: ['subscription'] });
    addTx(key, 17, { type: 'expense', amount: 10, category: 'subscriptions', merchant: 'Notion', account: credit, tags: ['subscription'] });
    addTx(key, 20, { type: 'expense', amount: 39, category: 'subscriptions', merchant: 'Peak Fitness', account: credit, tags: ['subscription'] });
    addTx(key, 22, { type: 'expense', amount: 22.99, category: 'subscriptions', merchant: 'Adobe Creative Cloud', account: credit, tags: ['subscription'] });

    for (let i = 0; i < int(6, 9); i += 1) {
      const [merchant, min, max] = pick(diningSpots);
      addTx(key, int(1, 28), { type: 'expense', amount: between(min, max), category: 'dining', merchant, account: credit, tags: ['food'] });
    }

    for (const day of [3, 9, 16, 23, 29]) {
      addTx(key, day + int(-1, 1), {
        type: 'expense',
        amount: between(52, 178),
        category: 'groceries',
        merchant: pick(groceryStores),
        account: checking,
        tags: ['essential'],
      });
    }

    for (let i = 0; i < int(4, 6); i += 1) {
      const [merchant, min, max] = pick(transportSpots);
      addTx(key, int(1, 28), { type: 'expense', amount: between(min, max), category: 'transport', merchant, account: checking });
    }

    for (let i = 0; i < int(2, 3); i += 1) {
      const [merchant, min, max] = pick(shoppingSpots);
      addTx(key, int(2, 27), { type: 'expense', amount: between(min, max), category: 'shopping', merchant, account: credit, tags: ['lifestyle'] });
    }

    addTx(key, int(6, 26), {
      type: 'expense', amount: between(16, 58), category: 'entertainment',
      merchant: pick(['AMC Theatres', 'Steam', 'Live Nation', 'Museum of Modern Art']), account: credit,
    });
    addTx(key, int(8, 24), {
      type: 'expense', amount: between(12, 48), category: 'health',
      merchant: pick(['Walgreens', 'CVS Pharmacy', 'Downtown Dental']), account: checking,
    });
    addTx(key, int(12, 25), {
      type: 'expense', amount: between(26, 82), category: 'personal',
      merchant: pick(['Sephora', 'Barber & Co.', 'Aesop']), account: credit,
    });

    if (Math.abs(offset) % 3 === 0) {
      addTx(key, int(9, 22), {
        type: 'expense', amount: between(280, 680), category: 'travel',
        merchant: pick(['Delta Air Lines', 'Airbnb', 'Marriott Bonvoy']), account: checking,
        note: 'Weekend escape', tags: ['trip'],
      });
    }
    if (Math.abs(offset) % 2 === 0) {
      addTx(key, int(4, 20), { type: 'expense', amount: 39, category: 'education', merchant: 'Coursera', account: credit });
    }
    if (Math.abs(offset) % 4 === 0) {
      addTx(key, 27, { type: 'expense', amount: 4.5, category: 'fees', merchant: 'Bank service fee', account: checking });
    }

    addTx(key, int(6, 20), {
      type: 'income', amount: between(380, 980), category: 'freelance',
      merchant: pick(['Studio Nova', 'Pixelcraft Studio', 'Freelance client']), account: checking,
      note: 'Project milestone', tags: ['side-hustle'],
    });
    if (random() > 0.5) {
      addTx(key, int(2, 24), {
        type: 'income', amount: between(18, 76), category: 'refunds',
        merchant: 'Amazon Refund', account: credit, note: 'Returned order',
      });
    }
    if (Math.abs(offset) % 3 === 1) {
      addTx(key, 13, { type: 'income', amount: between(120, 320), category: 'investments', merchant: 'Vanguard Dividend', account: savings });
    }

    addTx(key, 16, {
      type: 'transfer', amount: 900, category: 'transfer', merchant: 'Transfer to High-Yield Savings',
      account: checking, toAccount: savings, note: 'Monthly savings', tags: ['savings'],
    });
    addTx(key, 25, {
      type: 'transfer', amount: 400, category: 'transfer', merchant: 'Transfer to Growth Portfolio',
      account: checking, toAccount: investment, note: 'Auto-invest', tags: ['investing'],
    });
    addTx(key, 26, {
      type: 'transfer', amount: 700, category: 'transfer', merchant: 'Credit card payment',
      account: checking, toAccount: credit, note: 'Aurora card payment',
    });

    if (offset === 0) {
      addTx(key, 2, { type: 'expense', amount: 24.5, category: 'health', merchant: 'Walgreens', account: checking });
      addTx(key, 3, { type: 'expense', amount: 21.75, category: 'entertainment', merchant: 'AMC Theatres', account: credit });
      addTx(key, 4, { type: 'expense', amount: 87.2, category: 'shopping', merchant: 'Target', account: credit, tags: ['lifestyle'] });
      addTx(key, 4, { type: 'expense', amount: 74.1, category: 'groceries', merchant: 'Whole Foods Market', account: checking, tags: ['essential'] });
      addTx(key, 5, { type: 'expense', amount: 18.4, category: 'transport', merchant: 'Uber', account: checking });
      addTx(key, 5, { type: 'expense', amount: 13.95, category: 'dining', merchant: 'Blue Bottle Coffee', account: credit, tags: ['food'] });
      addTx(key, 6, { type: 'expense', amount: 29.8, category: 'personal', merchant: 'Barber & Co.', account: credit });
      addTx(key, 6, { type: 'expense', amount: 46.3, category: 'dining', merchant: 'Sweetgreen', account: credit, tags: ['food'] });
    }
  }

  await Transaction.insertMany(transactions);

  await Budget.create([
    { user: user._id, category: 'housing', amount: 1950 },
    { user: user._id, category: 'groceries', amount: 650 },
    { user: user._id, category: 'dining', amount: 330 },
    { user: user._id, category: 'transport', amount: 240 },
    { user: user._id, category: 'shopping', amount: 320 },
    { user: user._id, category: 'entertainment', amount: 140 },
    { user: user._id, category: 'utilities', amount: 230 },
    { user: user._id, category: 'subscriptions', amount: 110 },
    { user: user._id, category: 'health', amount: 150 },
    { user: user._id, category: 'personal', amount: 120 },
    { user: user._id, category: 'travel', amount: 400 },
    { user: user._id, category: 'insurance', amount: 160 },
  ]);

  const goalSeeds = [
    {
      name: 'Japan Trip', targetAmount: 6000, deadline: addMonthsToISO(today, 6), color: '#3EE8A7', icon: 'plane',
      contributions: [[1, 420], [2, 500], [3, 460], [4, 540], [5, 600], [6, 620]],
    },
    {
      name: 'Emergency Fund', targetAmount: 15000, deadline: null, color: '#38BDF8', icon: 'shield',
      contributions: [[1, 800], [2, 800], [3, 850], [4, 900], [5, 900], [6, 950], [7, 1000]],
    },
    {
      name: 'MacBook Pro', targetAmount: 2400, deadline: addMonthsToISO(today, 3), color: '#A78BFA', icon: 'laptop',
      contributions: [[1, 380], [2, 420], [3, 450], [4, 300]],
    },
    {
      name: 'Home Studio', targetAmount: 3500, deadline: addMonthsToISO(today, 10), color: '#FBBF24', icon: 'music',
      contributions: [[1, 250], [2, 300], [3, 280]],
    },
  ];

  for (const seed of goalSeeds) {
    const goal = await Goal.create({
      user: user._id,
      name: seed.name,
      targetAmount: seed.targetAmount,
      deadline: seed.deadline,
      color: seed.color,
      icon: seed.icon,
    });

    const contributions = seed.contributions.map(([monthsAgo, amount], index) => {
      let date = addMonthsToISO(today, -monthsAgo);
      if (date > today) date = today;
      return {
        user: user._id,
        goal: goal._id,
        amount,
        date,
        note: index === 0 ? 'Kick-off contribution' : 'Monthly top-up',
      };
    });
    await GoalContribution.insertMany(contributions);
  }

  const nextMonthly = (day) => {
    const [year, month, todayNum] = today.split('-').map(Number);
    if (day >= todayNum) {
      return `${year}-${pad(month)}-${pad(Math.min(day, monthBounds(currentMonth).days))}`;
    }
    const nextKey = shiftMonth(currentMonth, 1);
    return `${nextKey}-${pad(Math.min(day, monthBounds(nextKey).days))}`;
  };

  await Subscription.create([
    { user: user._id, name: 'Netflix', amount: 15.49, category: 'subscriptions', account: credit, frequency: 'monthly', nextDate: nextMonthly(3) },
    { user: user._id, name: 'Spotify', amount: 11.99, category: 'subscriptions', account: credit, frequency: 'monthly', nextDate: nextMonthly(8) },
    { user: user._id, name: 'iCloud+', amount: 2.99, category: 'subscriptions', account: credit, frequency: 'monthly', nextDate: nextMonthly(11) },
    { user: user._id, name: 'Notion', amount: 10, category: 'subscriptions', account: credit, frequency: 'monthly', nextDate: nextMonthly(17) },
    { user: user._id, name: 'Peak Fitness', amount: 39, category: 'subscriptions', account: credit, frequency: 'monthly', nextDate: nextMonthly(20) },
    { user: user._id, name: 'Adobe Creative Cloud', amount: 22.99, category: 'subscriptions', account: credit, frequency: 'monthly', nextDate: nextMonthly(22) },
    { user: user._id, name: 'Fiberline Internet', amount: 65, category: 'utilities', account: checking, frequency: 'monthly', nextDate: nextMonthly(6) },
    { user: user._id, name: 'City Power & Light', amount: 95, category: 'utilities', account: checking, frequency: 'monthly', nextDate: nextMonthly(5) },
  ]);

  return user;
}

import { fileURLToPath } from 'node:url';

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { connectDb } = await import('./db.js');
  connectDb()
    .then(() => seedDemo({ force: true }))
    .then(() => {
      console.log('[seed] demo workspace rebuilt');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[seed] failed', err);
      process.exit(1);
    });
}
