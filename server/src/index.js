import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { connectDb } from './db.js';
import { seedDemo } from './seed.js';
import { errorHandler, notFoundHandler } from './lib/errors.js';
import authRoutes from './routes/auth.js';
import metaRoutes from './routes/meta.js';
import accountRoutes from './routes/accounts.js';
import transactionRoutes from './routes/transactions.js';
import budgetRoutes from './routes/budgets.js';
import goalRoutes from './routes/goals.js';
import subscriptionRoutes from './routes/subscriptions.js';
import dashboardRoutes from './routes/dashboard.js';
import analyticsRoutes from './routes/analytics.js';
import demoRoutes from './routes/demo.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'spendwise-api' }));
app.use('/api/auth', authRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/demo', demoRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  await connectDb();
  await seedDemo();
  app.listen(config.port, () => {
    console.log(`[api] SpendWise running on http://localhost:${config.port}`);
    console.log(`[demo] ${config.demoEmail} / ${config.demoPassword}`);
  });
}

start().catch((err) => {
  console.error('[startup] failed', err);
  process.exit(1);
});
