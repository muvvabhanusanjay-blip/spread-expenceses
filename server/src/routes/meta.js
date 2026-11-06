import { Router } from 'express';
import {
  CATEGORIES,
  CURRENCIES,
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  FREQUENCIES,
} from '../constants.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    categories: CATEGORIES,
    currencies: CURRENCIES,
    accountTypes: ACCOUNT_TYPES.map((id) => ({ id, label: ACCOUNT_TYPE_LABELS[id] })),
    frequencies: FREQUENCIES,
  });
});

export default router;
