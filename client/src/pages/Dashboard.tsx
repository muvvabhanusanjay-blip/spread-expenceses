import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarDays, ChartPie, PiggyBank,
  Plus, ReceiptText, Sparkles, Target, TrendingUp, TriangleAlert, Wallet,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, ApiError } from '../lib/api';
import type { DashboardData, Insight } from '../lib/types';
import { useDocumentTitle, useRefreshKey } from '../lib/hooks';
import {
  currentMonthKey, dueLabel, formatDate, formatMoney, formatMonth, formatPercent, greeting, parseISODate,
} from '../lib/format';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { ProgressBar, ProgressRing } from '../components/ui/Progress';
import { Delta } from '../components/ui/Delta';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { MonthSwitcher } from '../components/ui/MonthSwitcher';
import { TransactionRow } from '../components/ui/TransactionRow';
import { CashflowChart } from '../components/charts/CashflowChart';
import { SpendDonut } from '../components/charts/SpendDonut';
import { TransactionModal } from '../components/TransactionModal';
import { GOAL_ICONS, categoryMeta } from '../lib/categories';

const INSIGHT_ICONS = {
  budget: ChartPie,
  trend: TrendingUp,
  savings: PiggyBank,
  bills: CalendarDays,
  onboarding: Sparkles,
};

export function Dashboard() {
  useDocumentTitle('Overview');
  const { user } = useAuth();
  const toast = useToast();
  const currency = user?.currency || 'USD';

  const [month, setMonth] = useState(currentMonthKey());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const refreshKey = useRefreshKey();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api
      .dashboard(month)
      .then((response) => {
        if (active) setData(response);
      })
      .catch((err) => {
        if (!active) return;
        const message = err instanceof ApiError ? err.message : 'Could not load your dashboard.';
        setError(message);
        toast.error('Dashboard unavailable', message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, refreshKey, reloadKey]);

  const isCurrent = month === currentMonthKey();

  if (loading && !data) return <DashboardSkeleton />;

  if (error && !data) {
    return (
      <>
        <PageHeader title="Your money at a glance" subtitle="We couldn't load this month's data." />
        <Card>
          <EmptyState
            icon={TriangleAlert}
            title="Something went wrong"
            message={error}
            action={<Button onClick={() => setReloadKey((value) => value + 1)} variant="primary">Try again</Button>}
          />
        </Card>
      </>
    );
  }

  if (!data) return null;

  const { summary, cashflow, budgets, budgetSummary, goals, recent, upcoming, insights } = data;
  const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const daysLeft = isCurrent ? Math.max(0, daysInMonth - Number(data.today.slice(8, 10))) : 0;
  const avgIncome = cashflow.reduce((sum, point) => sum + point.income, 0) / Math.max(1, cashflow.length);
  const avgExpense = cashflow.reduce((sum, point) => sum + point.expense, 0) / Math.max(1, cashflow.length);
  const topBudgets = budgets.slice(0, 4);
  const topGoals = goals.slice(0, 3);

  return (
    <>
      <PageHeader
        eyebrow={formatDate(data.today, 'EEEE, MMMM d')}
        title={greeting(user?.name)}
        subtitle="Here's the shape of your money this month."
        actions={(
          <>
            {!isCurrent && (
              <Button variant="ghost" size="sm" onClick={() => setMonth(currentMonthKey())}>This month</Button>
            )}
            <MonthSwitcher value={month} onChange={setMonth} />
            <Button variant="primary" iconLeft={<Plus size={16} />} onClick={() => setAddOpen(true)}>
              Add transaction
            </Button>
          </>
        )}
      />

      <div className="stat-grid">
        <Card className="stat-card">
          <div className="stat-top">
            <span className="stat-icon tone-mint"><Wallet size={18} /></span>
            <span className="stat-label">Net worth</span>
          </div>
          <strong className="stat-value">{formatMoney(summary.netWorth, currency, { decimals: 0 })}</strong>
          <div className="stat-foot">
            <span className={summary.netFlow >= 0 ? 'value-positive' : 'value-negative'}>
              {formatMoney(summary.netFlow, currency, { decimals: 0, sign: true })}
            </span>
            <span className="muted">this month</span>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-top">
            <span className="stat-icon tone-sky"><ArrowDownLeft size={18} /></span>
            <span className="stat-label">Income</span>
          </div>
          <strong className="stat-value">{formatMoney(summary.income, currency, { decimals: 0 })}</strong>
          <div className="stat-foot">
            <Delta value={summary.incomeChange} suffix="vs last month" />
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-top">
            <span className="stat-icon tone-pink"><ArrowUpRight size={18} /></span>
            <span className="stat-label">Spending</span>
          </div>
          <strong className="stat-value">{formatMoney(summary.expense, currency, { decimals: 0 })}</strong>
          <div className="stat-foot">
            <Delta value={summary.expenseChange} suffix="vs last month" invert />
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-top">
            <span className="stat-icon tone-amber"><PiggyBank size={18} /></span>
            <span className="stat-label">Savings rate</span>
          </div>
          <strong className="stat-value">{formatPercent(summary.savingsRate, 0)}</strong>
          <div className="stat-foot stat-foot-column">
            <ProgressBar value={Math.max(0, summary.savingsRate)} height={6} color="var(--accent)" />
            <span className="muted small">
              {summary.savingsRate >= 20 ? 'Above your 20% target' : summary.savingsRate >= 0 ? 'Target is 20% of income' : 'Spending exceeded income'}
            </span>
          </div>
        </Card>
      </div>

      {insights.length > 0 && (
        <div className="insight-row">
          {insights.slice(0, 3).map((insight: Insight, index) => {
            const Icon = INSIGHT_ICONS[insight.kind] || Sparkles;
            return (
              <div key={`${insight.kind}-${index}`} className={`insight-card insight-${insight.tone}`}>
                <span className="insight-icon"><Icon size={17} /></span>
                <div>
                  <strong>{insight.title}</strong>
                  <p>{insight.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="dash-grid">
        <Card className="col-8">
          <CardHeader
            title="Cash flow"
            subtitle="Income and expenses over the last six months"
            action={(
              <div className="chart-legend">
                <span><i style={{ background: '#3EE8A7' }} />Income</span>
                <span><i style={{ background: '#7C8CF8' }} />Expenses</span>
              </div>
            )}
          />
          <CashflowChart data={cashflow} currency={currency} />
          <div className="mini-metrics">
            <div>
              <span>Avg. monthly income</span>
              <strong>{formatMoney(avgIncome, currency, { decimals: 0 })}</strong>
            </div>
            <div>
              <span>Avg. monthly spend</span>
              <strong>{formatMoney(avgExpense, currency, { decimals: 0 })}</strong>
            </div>
            <div>
              <span>Net this month</span>
              <strong className={summary.netFlow >= 0 ? 'value-positive' : 'value-negative'}>
                {formatMoney(summary.netFlow, currency, { decimals: 0, sign: true })}
              </strong>
            </div>
          </div>
        </Card>

        <Card className="col-4">
          <CardHeader
            title="Spending breakdown"
            subtitle={`Where your money went in ${formatMonth(month)}`}
            action={<Link to="/analytics" className="text-link">Report</Link>}
          />
          <SpendDonut
            categories={data.categories}
            currency={currency}
            total={summary.expense}
            centerLabel={`spent in ${formatMonth(month, 'short')}`}
          />
        </Card>

        <Card className="col-7">
          <CardHeader
            title="Recent activity"
            subtitle="Your latest transactions"
            action={<Link to="/transactions" className="text-link">View all <ArrowRight size={13} /></Link>}
          />
          {recent.length ? (
            <div className="tx-list">
              {recent.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} currency={currency} />
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              icon={ReceiptText}
              title="No transactions yet"
              message="Record your first expense or income to bring this page to life."
              action={<Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}>Add transaction</Button>}
            />
          )}
        </Card>

        <Card className="col-5">
          <CardHeader
            title="Budget pulse"
            subtitle={isCurrent ? `${daysLeft} days left this month` : formatMonth(month)}
            action={<Link to="/budgets" className="text-link">Manage</Link>}
          />
          {budgets.length ? (
            <>
              <div className="budget-total">
                <div className="budget-total-row">
                  <span>Overall budget</span>
                  <strong>{formatMoney(budgetSummary.totalSpent, currency, { decimals: 0 })} <span>of {formatMoney(budgetSummary.totalBudget, currency, { decimals: 0 })}</span></strong>
                </div>
                <ProgressBar
                  value={budgetSummary.pct}
                  tone={budgetSummary.pct > 100 ? 'danger' : budgetSummary.pct > 80 ? 'warning' : 'positive'}
                  height={9}
                />
                <span className="muted small">
                  {budgetSummary.remaining >= 0
                    ? `${formatMoney(budgetSummary.remaining, currency, { decimals: 0 })} still available`
                    : `${formatMoney(Math.abs(budgetSummary.remaining), currency, { decimals: 0 })} over budget`}
                </span>
              </div>

              <div className="budget-mini-list">
                {topBudgets.map((budget) => {
                  const meta = categoryMeta(budget.category);
                  const over = budget.pct > 100;
                  return (
                    <div className="budget-mini" key={budget.id}>
                      <CategoryIcon category={budget.category} size={30} iconSize={15} color={meta.color} />
                      <div className="budget-mini-copy">
                        <div className="budget-mini-head">
                          <span>{budget.label}</span>
                          <span className={over ? 'value-negative' : 'muted'}>
                            {formatMoney(budget.spent, currency, { decimals: 0 })}
                            <small> / {formatMoney(budget.amount, currency, { decimals: 0 })}</small>
                          </span>
                        </div>
                        <ProgressBar
                          value={budget.pct}
                          color={meta.color}
                          tone={over ? 'danger' : 'default'}
                          height={5}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <EmptyState
              compact
              icon={ChartPie}
              title="No budgets yet"
              message="Create a budget and we'll track the pace for you."
              action={<Link to="/budgets" className="btn btn-secondary btn-sm">Set up budgets</Link>}
            />
          )}
        </Card>

        <Card className="col-6">
          <CardHeader
            title="Goals"
            subtitle={summary.goalsTarget > 0
              ? `${formatMoney(summary.goalsSaved, currency, { decimals: 0 })} saved of ${formatMoney(summary.goalsTarget, currency, { decimals: 0 })}`
              : 'What are you saving toward?'}
            action={<Link to="/goals" className="text-link">All goals</Link>}
          />
          {topGoals.length ? (
            <div className="goal-mini-list">
              {topGoals.map((goal) => {
                const Icon = GOAL_ICONS[goal.icon] || Target;
                return (
                  <Link to="/goals" key={goal.id} className="goal-mini">
                    <ProgressRing value={Math.min(100, goal.pct)} size={52} stroke={5} color={goal.color}>
                      <Icon size={16} color={goal.color} />
                    </ProgressRing>
                    <div className="goal-mini-copy">
                      <strong>{goal.name}</strong>
                      <span>{formatMoney(goal.saved, currency, { decimals: 0 })} of {formatMoney(goal.targetAmount, currency, { decimals: 0 })}</span>
                    </div>
                    <span className="goal-mini-pct">{formatPercent(goal.pct, 0)}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState
              compact
              icon={Target}
              title="No goals yet"
              message="Turn a wish into a plan with a savings goal."
              action={<Link to="/goals" className="btn btn-secondary btn-sm">Create a goal</Link>}
            />
          )}
        </Card>

        <Card className="col-6">
          <CardHeader
            title="Upcoming bills"
            subtitle="Recurring charges on the horizon"
            action={<Link to="/subscriptions" className="text-link">View all</Link>}
          />
          {upcoming.length ? (
            <div className="bill-list">
              {upcoming.slice(0, 4).map((bill) => {
                const date = parseISODate(bill.nextDate);
                return (
                  <div className="bill-row" key={bill.id}>
                    <span className="bill-date">
                      <span>{format(date, 'MMM')}</span>
                      <strong>{format(date, 'd')}</strong>
                    </span>
                    <div className="bill-copy">
                      <strong>{bill.name}</strong>
                      <span className={bill.daysUntil != null && bill.daysUntil <= 3 ? 'bill-due is-soon' : 'bill-due'}>
                        {dueLabel(bill.daysUntil)}
                      </span>
                    </div>
                    <strong className="bill-amount">{formatMoney(bill.amount, currency, { decimals: 2 })}</strong>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              compact
              icon={CalendarDays}
              title="No upcoming bills"
              message="Add subscriptions to see due dates here."
            />
          )}
        </Card>
      </div>

      <TransactionModal open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="page-header">
        <div className="page-heading">
          <Skeleton width={130} height={11} />
          <Skeleton width={320} height={34} className="skeleton-gap" />
          <Skeleton width={250} height={13} />
        </div>
      </div>
      <div className="stat-grid">
        {[0, 1, 2, 3].map((index) => (
          <Card key={index} className="stat-card">
            <Skeleton width={120} height={16} />
            <Skeleton width="68%" height={30} className="skeleton-gap" />
            <Skeleton width="50%" height={12} />
          </Card>
        ))}
      </div>
      <div className="dash-grid">
        <Card className="col-8"><Skeleton width={160} height={18} /><Skeleton height={268} className="skeleton-gap" radius={16} /></Card>
        <Card className="col-4"><Skeleton width={160} height={18} /><Skeleton height={210} className="skeleton-gap" radius={16} /><Skeleton height={80} className="skeleton-gap" /></Card>
        <Card className="col-7"><Skeleton width={160} height={18} /><Skeleton height={220} className="skeleton-gap" /></Card>
        <Card className="col-5"><Skeleton width={160} height={18} /><Skeleton height={220} className="skeleton-gap" /></Card>
      </div>
    </>
  );
}
