import { useEffect, useMemo, useState } from 'react';
import { ChartPie, Pencil, Plus, Target, Trash2, TriangleAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, ApiError } from '../lib/api';
import type { Budget, BudgetsResponse } from '../lib/types';
import { useDocumentTitle, useRefreshKey } from '../lib/hooks';
import {
  currentMonthKey, currencySymbol, formatMoney, formatMonth, formatPercent, todayISO,
} from '../lib/format';
import { EXPENSE_CATEGORIES, categoryMeta } from '../lib/categories';
import { PageHeader } from '../components/ui/PageHeader';
import { Button, IconButton } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ProgressBar, ProgressRing } from '../components/ui/Progress';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { MonthSwitcher } from '../components/ui/MonthSwitcher';
import { Modal } from '../components/ui/Modal';
import { Field, Input, Select } from '../components/ui/Forms';
import { ConfirmModal } from '../components/ui/ConfirmModal';

export function Budgets() {
  useDocumentTitle('Budgets');
  const { user } = useAuth();
  const toast = useToast();
  const currency = user?.currency || 'USD';

  const [month, setMonth] = useState(currentMonthKey());
  const [data, setData] = useState<BudgetsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshKey = useRefreshKey();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [category, setCategory] = useState('groceries');
  const [amount, setAmount] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Budget | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .budgets(month)
      .then((response) => {
        if (active) setData(response);
      })
      .catch((err) => {
        if (active) toast.error('Could not load budgets', err instanceof ApiError ? err.message : undefined);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, refreshKey]);

  const budgets = data?.budgets || [];
  const usedCategories = new Set(budgets.map((budget) => budget.category));
  const availableCategories = useMemo(
    () => EXPENSE_CATEGORIES.filter((item) => !usedCategories.has(item.id)),
    [budgets]
  );

  const isCurrent = month === currentMonthKey();
  const summary = data?.summary || { totalBudget: 0, totalSpent: 0, remaining: 0, pct: 0 };
  const overBudget = budgets.filter((budget) => budget.pct > 100);
  const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const dayOfMonth = Number(todayISO().slice(8, 10));
  const expectedPct = isCurrent ? Math.min(100, (dayOfMonth / daysInMonth) * 100) : 100;
  const paceDelta = summary.pct - expectedPct;
  const ringColor = summary.pct > 100 ? 'var(--danger)' : summary.pct > 85 ? 'var(--warning)' : 'var(--accent)';

  const openAdd = () => {
    setEditing(null);
    setCategory(availableCategories[0]?.id || '');
    setAmount('');
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (budget: Budget) => {
    setEditing(budget);
    setCategory(budget.category);
    setAmount(String(budget.amount));
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setFormError('');
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setFormError('Enter a budget amount greater than zero.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.updateBudget(editing.id, numeric);
        toast.success('Budget updated', `${editing.label} is now ${formatMoney(numeric, currency, { decimals: 0 })}.`);
      } else {
        await api.createBudget(category, numeric);
        toast.success('Budget created', `${categoryMeta(category).label} is now tracked.`);
      }
      setModalOpen(false);
      window.dispatchEvent(new Event('spendwise:data-changed'));
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not save the budget.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await api.deleteBudget(deleting.id);
      toast.success('Budget removed', `${deleting.label} is no longer tracked.`);
      setDeleting(null);
      window.dispatchEvent(new Event('spendwise:data-changed'));
    } catch (err) {
      toast.error('Could not remove budget', err instanceof ApiError ? err.message : undefined);
      throw err;
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Monthly plan"
        title="Budgets"
        subtitle="Set gentle guardrails, then let the numbers do the nudging."
        actions={(
          <>
            <MonthSwitcher value={month} onChange={setMonth} />
            <Button variant="primary" iconLeft={<Plus size={16} />} onClick={openAdd} disabled={!availableCategories.length && !editing}>
              Add budget
            </Button>
          </>
        )}
      />

      {loading && !data ? (
        <>
          <Card><Skeleton height={220} radius={18} /></Card>
          <div className="budget-grid">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <Card key={index}><Skeleton width="55%" height={18} /><Skeleton height={60} className="skeleton-gap" /><Skeleton height={8} /></Card>
            ))}
          </div>
        </>
      ) : (
        <>
          <Card className="budget-hero">
            <div className="budget-hero-main">
              <div className="budget-hero-head">
                <div>
                  <span className="eyebrow">Plan for {formatMonth(month)}</span>
                  <h2>{formatMoney(summary.totalBudget, currency, { decimals: 0 })} allocated</h2>
                </div>
                <span className={`pace-chip ${paceDelta > 8 ? 'is-warn' : paceDelta < -8 ? 'is-calm' : ''}`}>
                  {!isCurrent
                    ? 'Closed month'
                    : paceDelta > 8
                      ? 'Ahead of pace'
                      : paceDelta < -8
                        ? 'Comfortably on pace'
                        : 'On pace'}
                </span>
              </div>

              <div className="budget-hero-stats">
                <div>
                  <span>Spent</span>
                  <strong>{formatMoney(summary.totalSpent, currency, { decimals: 0 })}</strong>
                </div>
                <div>
                  <span>Remaining</span>
                  <strong className={summary.remaining < 0 ? 'value-negative' : 'value-positive'}>
                    {formatMoney(summary.remaining, currency, { decimals: 0, sign: summary.remaining < 0 })}
                  </strong>
                </div>
                <div>
                  <span>{isCurrent ? 'Days left' : 'Categories'}</span>
                  <strong>{isCurrent ? data?.daysLeft ?? 0 : budgets.length}</strong>
                </div>
                <div>
                  <span>Over budget</span>
                  <strong className={overBudget.length ? 'value-negative' : ''}>{overBudget.length}</strong>
                </div>
              </div>

              <div className="budget-hero-bar">
                <ProgressBar value={summary.pct} height={12} tone={summary.pct > 100 ? 'danger' : summary.pct > 85 ? 'warning' : 'positive'} />
                <div className="budget-hero-bar-labels">
                  <span>{formatPercent(summary.pct, 0)} used</span>
                  <span>
                    {summary.remaining >= 0
                      ? `${formatMoney(summary.remaining, currency, { decimals: 0 })} left · ${isCurrent ? `${data?.daysLeft ?? 0} days` : 'reset monthly'}`
                      : `${formatMoney(Math.abs(summary.remaining), currency, { decimals: 0 })} over`}
                  </span>
                </div>
              </div>
            </div>

            <div className="budget-hero-side">
              <ProgressRing value={Math.min(100, summary.pct)} size={150} stroke={10} color={ringColor}>
                <div className="ring-caption">
                  <strong>{formatPercent(summary.pct, 0)}</strong>
                  <span>of plan used</span>
                </div>
              </ProgressRing>
              <p className="muted small">
                {overBudget.length
                  ? `${overBudget.length} categor${overBudget.length === 1 ? 'y is' : 'ies are'} past the limit.`
                  : budgets.length
                    ? 'Every category is inside its limit.'
                    : 'No limits set yet — start with the essentials.'}
              </p>
            </div>
          </Card>

          {budgets.length ? (
            <div className="budget-grid">
              {budgets.map((budget) => {
                const meta = categoryMeta(budget.category);
                const over = budget.pct > 100;
                const near = budget.pct > 85 && !over;
                return (
                  <Card key={budget.id} className={`budget-card ${over ? 'is-over' : ''}`}>
                    <div className="budget-card-head">
                      <div className="budget-card-title">
                        <CategoryIcon category={budget.category} size={38} iconSize={18} />
                        <div>
                          <span>{budget.label}</span>
                          <small>{formatPercent(budget.pct, 0)} used</small>
                        </div>
                      </div>
                      <div className="row-actions">
                        <IconButton label={`Edit ${budget.label} budget`} onClick={() => openEdit(budget)}>
                          <Pencil size={15} />
                        </IconButton>
                        <IconButton label={`Delete ${budget.label} budget`} tone="danger" onClick={() => setDeleting(budget)}>
                          <Trash2 size={15} />
                        </IconButton>
                      </div>
                    </div>

                    <div className="budget-card-amounts">
                      <strong>{formatMoney(budget.spent, currency, { decimals: 0 })}</strong>
                      <span>of {formatMoney(budget.amount, currency, { decimals: 0 })}</span>
                    </div>

                    <ProgressBar
                      value={budget.pct}
                      color={meta.color}
                      tone={over ? 'danger' : near ? 'warning' : 'default'}
                      height={8}
                    />

                    <div className="budget-card-foot">
                      <span className={over ? 'value-negative' : 'muted'}>
                        {over
                          ? `${formatMoney(Math.abs(budget.remaining), currency, { decimals: 0 })} over`
                          : `${formatMoney(budget.remaining, currency, { decimals: 0 })} left`}
                      </span>
                      <span className={`budget-badge ${over ? 'is-over' : near ? 'is-near' : 'is-ok'}`}>
                        {over ? <TriangleAlert size={12} /> : null}
                        {over ? 'Over budget' : near ? 'Almost there' : 'On track'}
                      </span>
                    </div>
                  </Card>
                );
              })}

              {availableCategories.length > 0 && (
                <button type="button" className="budget-add-card" onClick={openAdd}>
                  <span className="budget-add-icon"><Plus size={20} /></span>
                  <strong>Add another category</strong>
                  <span>{availableCategories.length} available</span>
                </button>
              )}
            </div>
          ) : (
            <Card>
              <EmptyState
                icon={ChartPie}
                title="Give your money a plan"
                message="Set a monthly limit for the categories that matter. We'll track spending and warn you before things drift."
                action={<Button variant="primary" iconLeft={<Plus size={15} />} onClick={openAdd}>Create your first budget</Button>}
              />
            </Card>
          )}
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={saving ? () => undefined : () => setModalOpen(false)}
        title={editing ? `Edit ${editing.label} budget` : 'New budget'}
        subtitle={editing ? 'Adjust the monthly ceiling for this category.' : 'Pick a category and set a comfortable monthly ceiling.'}
        size="sm"
        footer={(
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              {editing ? 'Save budget' : 'Create budget'}
            </Button>
          </>
        )}
      >
        <div className="form-stack">
          {formError && <div className="form-error">{formError}</div>}
          <Field label="Category">
            {editing ? (
              <div className="static-field">
                <CategoryIcon category={editing.category} size={28} iconSize={14} />
                {editing.label}
              </div>
            ) : (
              <Select value={category} onChange={(event) => setCategory(event.target.value)}>
                {availableCategories.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Monthly limit" hint="Resets each month">
            <Input
              prefix={currencySymbol(currency)}
              type="number"
              min="1"
              step="1"
              placeholder="500"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              autoFocus
            />
          </Field>
          <div className="form-hint-card">
            <Target size={16} />
            <p>Budgets are compared with actual expenses in this category — transfers and income are ignored.</p>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Remove budget?"
        message={<p><strong>{deleting?.label}</strong> will no longer be tracked. Your transactions stay untouched.</p>}
        confirmLabel="Remove budget"
      />
    </>
  );
}
