import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { Account } from '../models/Account.js';
import { requireAuth } from '../middleware/auth.js';
import { catchAsync } from '../lib/errors.js';
import { serializeUser } from '../lib/serialize.js';
import { CURRENCIES } from '../constants.js';
import { requireString } from '../lib/validation.js';
import { ApiError } from '../lib/errors.js';

const router = Router();

const signToken = (user) =>
  jwt.sign({ sub: user._id.toString() }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

router.post(
  '/register',
  catchAsync(async (req, res) => {
    const name = requireString(req.body.name, 'Full name', { min: 2, max: 60 });
    const email = requireString(req.body.email, 'Email', { min: 5, max: 120 }).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      throw new ApiError(400, 'Please enter a valid email address.');
    }
    if (password.length < 8) {
      throw new ApiError(400, 'Password must be at least 8 characters.');
    }

    const existing = await User.findOne({ email });
    if (existing) throw new ApiError(409, 'An account with this email already exists.');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });

    await Account.create({
      user: user._id,
      name: 'Everyday Checking',
      type: 'checking',
      institution: '',
      color: '#7C8CF8',
      openingBalance: 0,
    });

    res.status(201).json({ token: signToken(user), user: serializeUser(user) });
  })
);

router.post(
  '/login',
  catchAsync(async (req, res) => {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!email || !password) throw new ApiError(400, 'Email and password are required.');

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) throw new ApiError(401, 'Email or password is incorrect.');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new ApiError(401, 'Email or password is incorrect.');

    res.json({ token: signToken(user), user: serializeUser(user) });
  })
);

router.get(
  '/me',
  requireAuth,
  catchAsync(async (req, res) => {
    res.json({ user: serializeUser(req.user) });
  })
);

router.patch(
  '/profile',
  requireAuth,
  catchAsync(async (req, res) => {
    const user = req.user;

    if (req.body.name !== undefined) {
      user.name = requireString(req.body.name, 'Full name', { min: 2, max: 60 });
    }
    if (req.body.currency !== undefined) {
      if (!CURRENCIES.includes(req.body.currency)) throw new ApiError(400, 'Choose a supported currency.');
      user.currency = req.body.currency;
    }

    await user.save();
    res.json({ user: serializeUser(user) });
  })
);

router.post(
  '/change-password',
  requireAuth,
  catchAsync(async (req, res) => {
    const currentPassword = typeof req.body.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';
    if (newPassword.length < 8) throw new ApiError(400, 'New password must be at least 8 characters.');

    const user = await User.findById(req.user._id).select('+passwordHash');
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new ApiError(400, 'Your current password is incorrect.');

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ ok: true });
  })
);

export default router;
