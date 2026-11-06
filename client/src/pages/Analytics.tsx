import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft, ArrowUpRight, CalendarDays, ChartPie, PiggyBank, Sparkles, Store, Target, TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, ApiError } from '../lib/api';
import type { AnalyticsData } from '../lib/types';
import { useDocumentTitle, useRefreshKey } from '../lib/hooks';
import { formatDate, formatMoney, formatMonth, formatPercent } from '../lib/format';
import { categoryMeta } from '../lib/categories';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { Delta } from '../components/ui/Delta';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { ProgressBar } from '../components/ui/Progress';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { CashflowChart } from '../components/charts/CashflowChart';
import { SpendDonut } from '../components/charts/SpendDonut';
import { WeekdayBars } from '../components/charts/WeekdayBars';

const RANGES = [3, 6, 12];

export function Analytics() {
  useDocumentTitle('Analytics');
  const { user } = useAuth();
  const toast = useToast();
  const currency = user?.currency || 'USD';
  const refreshKey = useRefreshKey();

  const [months, setMonths] = useState(6);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .analytics(months)
      .then((response) => {
        if (active) setData(response);
      })
      .catch((err) => {
        if (active) toast.error('Could not load analytics', err instanceof ApiError ? err.message : undefined);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months, refreshKey]);

  const daily = useMemo(() => (data?.dailySpend || []).slice(-70), [data]);
  const dailyMax = Math.max(1, ...daily.map((item) => item.amount));
  const topCategories = data?.categories.slice(0, 7) || [];
  const merchantMax = Math.max(1, ...(data?.merchants.map((item) => item.amount) || [1]));

  return (
    <>
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        subtitle="Patterns, not just numbers — see where your money really goes."
        actions={(
          <div className="range-switch" role="group" aria-label="Reporting range">
            {RANGES.map((range) => (
              <button
                key={range}
                type="button"
                className={`range-option ${months === range ? 'is-active' : ''}`}
                onClick={() => setMonths(range)}
              >
                {range}M
              </button>
            ))}
          </div>
        )}
      />

      {loading && !data ? (
        <>
          <div className="stat-grid">
            {[0, 1, 2, 3].map((index) => (
              <Card key={index} className="stat-card"><Skeleton width="55%" height={16} /><Skeleton height={30} className="skeleton-gap" /><Skeleton width="60%" height={12} /></Card>
            ))}
          </div>
          <Card><Skeleton width={180} height={20} /><Skeleton height={280} className="skeleton-gap" radius={16} /></Card>
        </>
      ) : !data ? (
        <Card>
          <EmptyState
            icon={ChartPie}
            title="No insights yet"
            message="Add a few transactions and this page will fill with trends, category insights and comparisons."
            action={<Button variant="primary" onClick={() => setMonths(6)}>Try again</Button>}
          />
        </Card>
      ) : (
        <>
          <div className="stat-grid">
            <Card className="stat-card">
              <div className="stat-top">
                <span className="stat-icon tone-mint"><ArrowDownLeft size={18} /></span>
                <span className="stat-label">Income</span>
              </div>
              <strong className="stat-value">{formatMoney(data.summary.totalIncome, currency, { decimals: 0 })}</strong>
              <div className="stat-foot">
                <Delta value={data.summary.incomeChange} suffix={`vs prior ${months}M`} />
              </div>
            </Card>

            <Card className="stat-card">
              <div className="stat-top">
                <span className="stat-icon tone-pink"><ArrowUpRight size={18} /></span>
                <span className="stat-label">Spending</span>
              </div>
              <strong className="stat-value">{formatMoney(data.summary.totalExpense, currency, { decimals: 0 })}</strong>
              <div className="stat-foot">
                <Delta value={data.summary.expenseChange} suffix={`vs prior ${months}M`} invert />
              </div>
            </Card>

            <Card className="stat-card">
              <div className="stat-top">
                <span className="stat-icon tone-sky"><PiggyBank size={18} /></span>
                <span className="stat-label">Net saved</span>
              </div>
              <strong className={`stat-value ${data.summary.net < 0 ? 'value-negative' : ''}`}>
                {formatMoney(data.summary.net, currency, { decimals: 0, sign: true })}
              </strong>
              <div className="stat-foot">
                <span className="muted">
                  {formatMoney(data.summary.avgIncome, currency, { decimals: 0 })} avg / month in
                </span>
              </div>
            </Card>

            <Card className="stat-card">
              <div className="stat-top">
                <span className="stat-icon tone-amber"><Sparkles size={18} /></span>
                <span className="stat-label">Savings rate</span>
              </div>
              <strong className="stat-value">{formatPercent(data.summary.savingsRate, 0)}</strong>
              <div className="stat-foot stat-foot-column">
                <ProgressBar value={Math.max(0, data.summary.savingsRate)} height={6} color="var(--accent)" />
                <span className="muted small">
                  {formatMoney(data.summary.avgExpense, currency, { decimals: 0 })} avg / month out
                </span>
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Income vs. spending"
              subtitle={`${data.range.label} · monthly cash flow`}
              action={(
                <div className="chart-legend">
                  <span><i style={{ background: '#3EE8A7' }} />Income</span>
                  <span><i style={{ background: '#7C8CF8' }} />Spending</span>
                </div>
              )}
            />
            <CashflowChart data={data.cashflow} currency={currency} height={300} />
            <div className="mini-metrics">
              <div>
                <span>Best month</span>
                <strong>{data.summary.bestMonth ? `${data.summary.bestMonth.label} · ${formatMoney(data.summary.bestMonth.net, currency, { decimals: 0, sign: true })}` : '—'}</strong>
              </div>
              <div>
                <span>Spendiest month</span>
                <strong>{data.summary.spendiestMonth ? `${data.summary.spendiestMonth.label} · ${formatMoney(data.summary.spendiestMonth.expense, currency, { decimals: 0 })}` : '—'}</strong>
              </div>
              <div>
                <span>Average daily spend</span>
                <strong>{formatMoney(data.summary.avgDaily, currency, { decimals: 2 })}</strong>
              </div>
            </div>
          </Card>

          <div className="dash-grid">
            <Card className="col-7">
              <CardHeader
                title="Category breakdown"
                subtitle={`Spending across ${data.range.count} months`}
                action={(
                  <span className="muted small">
                    {data.summary.transactionCount} transactions
                  </span>
                )}
              />
              {topCategories.length ? (
                <div className="analytics-cat-list">
                  {topCategories.map((category) => (
                    <div className="analytics-cat" key={category.id}>
                      <CategoryIcon category={category.id} size={36} iconSize={17} />
                      <div className="analytics-cat-copy">
                        <div className="analytics-cat-head">
                          <span>{category.label}</span>
                          <strong>{formatMoney(category.amount, currency, { decimals: 0 })}</strong>
                        </div>
                        <ProgressBar value={category.pct} color={categoryMeta(category.id).color} height={6} />
                        <div className="analytics-cat-foot">
                          <span className="muted small">{formatPercent(category.pct, 0)} of spending</span>
                          <Delta value={category.changePct} suffix="vs prior" invert decimals={0} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState compact icon={ChartPie} title="No spending yet" message="This range has no expenses recorded." />
              )}
            </Card>

            <Card className="col-5">
              <CardHeader
                title="Share of wallet"
                subtitle={data.summary.topCategory ? `Largest: ${data.summary.topCategory.label}` : 'Spending distribution'}
              />
              <SpendDonut
                categories={data.categories}
                currency={currency}
                total={data.summary.totalExpense}
                centerLabel={`over ${data.range.count} months`}
                height={240}
              />
            </Card>

            <Card className="col-6">
              <CardHeader
                title="Weekly rhythm"
                subtitle={data.summary.peakWeekday ? `${data.summary.peakWeekday.day} is your heaviest day` : 'Spending by weekday'}
              />
              <WeekdayBars data={data.weekday} currency={currency} />
              <div className="mini-metrics mini-metrics-2">
                <div>
                  <span>Peak weekday</span>
                  <strong>{data.summary.peakWeekday ? `${data.summary.peakWeekday.day} · ${formatMoney(data.summary.peakWeekday.amount, currency, { decimals: 0 })}` : '—'}</strong>
                </div>
                <div>
                  <span>Avg. daily</span>
                  <strong>{formatMoney(data.summary.avgDaily, currency, { decimals: 2 })}</strong>
                </div>
              </div>
            </Card>

            <Card className="col-6">
              <CardHeader
                title="Daily spending pulse"
                subtitle={`Last ${daily.length} days with activity`}
                action={<span className="muted small">{formatMoney(data.summary.avgDaily, currency, { decimals: 2 })} / day</span>}
              />
              {daily.length ? (
                <>
                  <div className="daily-strip" aria-hidden="true">
                    {daily.map((day) => (
                      <span
                        key={day.date}
                        className="daily-bar"
                        style={{ height: `${Math.max(3, (day.amount / dailyMax) * 100)}%` }}
                        title={`${formatDate(day.date, 'MMM d')} · ${formatMoney(day.amount, currency, { decimals: 0 })}`}
                      />
                    ))}
                  </div>
                  <div className="daily-strip-labels">
                    <span>{formatDate(daily[0].date, 'MMM d')}</span>
                    <span>{formatDate(daily[daily.length - 1].date, 'MMM d')}</span>
                  </div>
                </>
              ) : (
                <EmptyState compact icon={CalendarDays} title="Nothing to chart" message="No daily spend in this range." />
              )}
              <div className="fact-pills">
                <span className="fact-pill">
                  <TrendingUp size={13} />
                  Peak {data.summary.peakWeekday?.day || '—'}
                </span>
                <span className="fact-pill">
                  <Store size={13} />
                  {data.summary.topMerchant ? data.summary.topMerchant.name : 'No merchant data'}
                </span>
              </div>
            </Card>

            <Card className="col-4">
              <CardHeader
                title="Top merchants"
                subtitle="Where the most money went"
              />
              {data.merchants.length ? (
                <div className="merchant-list">
                  {data.merchants.slice(0, 6).map((merchant, index) => (
                    <div className="merchant-row" key={merchant.name}>
                      <span className="merchant-rank">{index + 1}</span>
                      <div className="merchant-copy">
                        <strong>{merchant.name}</strong>
                        <span>{merchant.count} purchase{merchant.count === 1 ? '' : 's'}</span>
                        <ProgressBar value={(merchant.amount / merchantMax) * 100} height={5} color="var(--accent)" />
                      </div>
                      <strong className="merchant-amount">{formatMoney(merchant.amount, currency, { decimals: 0 })}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState compact icon={Store} title="No merchants" message="Merchant data will appear as you record spending." />
              )}
            </Card>

            <Card className="col-4">
              <CardHeader
                title="Income sources"
                subtitle={`${formatMoney(data.summary.totalIncome, currency, { decimals: 0 })} total`}
              />
              {data.summary.incomeSources.length ? (
                <SpendDonut
                  categories={data.summary.incomeSources}
                  currency={currency}
                  total={data.summary.totalIncome}
                  centerLabel="earned"
                  height={230}
                />
              ) : (
                <EmptyState compact icon={ArrowDownLeft} title="No income" message="Income sources appear once you log income." />
              )}
            </Card>

            <Card className="col-4">
              <CardHeader
                title="Account mix"
                subtitle={`${formatMoney(data.summary.netWorth, currency, { decimals: 0 })} net worth`}
              />
              {data.summary.accounts.length ? (
                <div className="account-mix">
                  {data.summary.accounts.map((account) => (
                    <div className="account-mix-row" key={account.id}>
                      <span className="account-mix-dot" style={{ background: account.color }} />
                      <div className="account-mix-copy">
                        <div>
                          <strong>{account.name}</strong>
                          <span>{formatMoney(account.balance, currency, { decimals: 0 })}</span>
                        </div>
                        <ProgressBar
                          value={account.pct}
                          height={5}
                          color={account.color}
                        />
                      </div>
                      <span className="muted small">{formatPercent(account.pct, 0)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState compact icon={PiggyBank} title="No accounts" message="Add accounts to see the mix." />
              )}
            </Card>
          </div>

          <Card className="fact-card">
            <div className="fact-grid">
              <div className="fact-cell">
                <span className="fact-icon"><Target size={17} /></span>
                <span>Top category</span>
                <strong>{data.summary.topCategory ? data.summary.topCategory.label : '—'}</strong>
                <small>{data.summary.topCategory ? formatMoney(data.summary.topCategory.amount, currency, { decimals: 0 }) : ''}</small>
              </div>
              <div className="fact-cell">
                <span className="fact-icon"><CalendarDays size={17} /></span>
                <span>Range covered</span>
                <strong>{data.range.label}</strong>
                <small>{data.range.count} months · {data.range.from.slice(0, 7)} to {data.range.to.slice(0, 7)}</small>
              </div>
              <div className="fact-cell">
                <span className="fact-icon"><Store size={17} /></span>
                <span>Top merchant</span>
                <strong>{data.summary.topMerchant ? data.summary.topMerchant.name : '—'}</strong>
                <small>{data.summary.topMerchant ? `${data.summary.topMerchant.count} purchases` : ''}</small>
              </div>
              <div className="fact-cell">
                <span className="fact-icon"><PiggyBank size={17} /></span>
                <span>Savings rate</span>
                <strong>{formatPercent(data.summary.savingsRate, 0)}</strong>
                <small>{formatMonth(data.endMonth)} to date</small>
              </div>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
