import { Router } from 'express';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError, catchAsync } from '../lib/errors.js';
import { seedDemo } from '../seed.js';

const router = Router();

router.post(
  '/reset',
  requireAuth,
  catchAsync(async (req, res) => {
    if (req.user.email !== config.demoEmail) {
      throw new ApiError(403, 'Resetting data is only available in the demo workspace.');
    }
    await seedDemo({ force: true });
    res.json({ ok: true });
  })
);

export default router;
