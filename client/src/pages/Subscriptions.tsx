import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, CreditCard, Pause, Pencil, Play, Plus, RefreshCcw, Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, ApiError } from '../lib/api';
import type { Account, Subscription, SubscriptionsResponse } from '../lib/types';
import { notifyDataChanged, useDocumentTitle, useRefreshKey } from '../lib/hooks';
import { currencySymbol, formatDate, formatMoney, todayISO } from '../lib/format';
import { EXPENSE_CATEGORIES, categoryMeta } from '../lib/categories';
import { PageHeader } from '../components/ui/PageHeader';
import { Button, IconButton } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Modal';
import { Field, Input, Select, Textarea } from '../components/ui/Forms';
import { Switch } from '../components/ui/Switch';
import { ConfirmModal } from '../components/ui/ConfirmModal';

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

const FREQUENCIES = ['weekly', 'monthly', 'quarterly', 'yearly'];

function dueTone(days: number | undefined) {
  if (days == null) return '';
  if (days < 0) return 'is-overdue';
  if (days <= 3) return 'is-soon';
  return '';
}

function dueText(days: number | undefined) {
  if (days == null) return '';
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `In ${days} days`;
}

export function Subscriptions() {
  useDocumentTitle('Subscriptions');
  const { user } = useAuth();
  const toast = useToast();
  const currency = user?.currency || 'USD';
  const refreshKey = useRefreshKey();

  const [data, setData] = useState<SubscriptionsResponse | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('subscriptions');
  const [frequency, setFrequency] = useState('monthly');
  const [nextDate, setNextDate] = useState(todayISO());
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Subscription | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    let activeRequest = true;
    setLoading(true);
    Promise.all([api.subscriptions(), api.accounts()])
      .then(([subscriptions, accountResponse]) => {
        if (!activeRequest) return;
        setData(subscriptions);
        setAccounts(accountResponse.accounts);
      })
      .catch((err) => {
        if (activeRequest) toast.error('Could not load subscriptions', err instanceof ApiError ? err.message : undefined);
      })
      .finally(() => {
        if (activeRequest) setLoading(false);
      });
    return () => {
      activeRequest = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const items = data?.items || [];
  const summary = data?.summary || { activeCount: 0, monthlyTotal: 0, yearlyTotal: 0, dueThisWeek: 0, dueThisMonth: 0 };
  const activeItems = useMemo(() => items.filter((item) => item.active), [items]);
  const pausedItems = useMemo(() => items.filter((item) => !item.active), [items]);
  const activeAccounts = accounts.filter((account) => !account.isArchived);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setAmount('');
    setCategory('subscriptions');
    setFrequency('monthly');
    setNextDate(todayISO());
    setAccountId(activeAccounts[0]?.id || '');
    setNotes('');
    setActive(true);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (subscription: Subscription) => {
    setEditing(subscription);
    setName(subscription.name);
    setAmount(String(subscription.amount));
    setCategory(subscription.category);
    setFrequency(subscription.frequency);
    setNextDate(subscription.nextDate);
    setAccountId(subscription.account?.id || '');
    setNotes(subscription.notes);
    setActive(subscription.active);
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setFormError('');
    const numeric = Number(amount);
    if (name.trim().length < 2) {
      setFormError('Give this subscription a name with at least two characters.');
      return;
    }
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setFormError('Enter an amount greater than zero.');
      return;
    }
    if (!nextDate) {
      setFormError('Choose the next charge date.');
      return;
    }

    const body = {
      name: name.trim(),
      amount: numeric,
      category,
      frequency,
      nextDate,
      account: accountId || null,
      notes: notes.trim(),
      active,
    };

    setSaving(true);
    try {
      if (editing) {
        await api.updateSubscription(editing.id, body);
        toast.success('Subscription updated', `${body.name} was saved.`);
      } else {
        await api.createSubscription(body);
        toast.success('Subscription added', `${body.name} is now tracked.`);
      }
      setModalOpen(false);
      notifyDataChanged();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not save this subscription.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (subscription: Subscription) => {
    setToggling(subscription.id);
    try {
      await api.updateSubscription(subscription.id, { active: !subscription.active });
      toast.success(
        subscription.active ? 'Subscription paused' : 'Subscription resumed',
        `${subscription.name} is now ${subscription.active ? 'excluded from upcoming bills' : 'back in your upcoming bills'}.`
      );
      notifyDataChanged();
    } catch (err) {
      toast.error('Could not update subscription', err instanceof ApiError ? err.message : undefined);
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await api.deleteSubscription(deleting.id);
      toast.success('Subscription deleted', `${deleting.name} was removed.`);
      setDeleting(null);
      notifyDataChanged();
    } catch (err) {
      toast.error('Could not delete subscription', err instanceof ApiError ? err.message : undefined);
      throw err;
    }
  };

  const renderRow = (subscription: Subscription) => {
    const meta = categoryMeta(subscription.category);
    return (
      <div className={`sub-row ${subscription.active ? '' : 'is-paused'}`} key={subscription.id}>
        <CategoryIcon category={subscription.category} size={40} iconSize={18} color={meta.color} />
        <div className="sub-copy">
          <div className="sub-title-line">
            <strong>{subscription.name}</strong>
            <span className={`sub-status ${subscription.active ? 'is-active' : 'is-paused'}`}>
              {subscription.active ? 'Active' : 'Paused'}
            </span>
          </div>
          <div className="sub-meta">
            <span>{FREQUENCY_LABELS[subscription.frequency] || subscription.frequency}</span>
            <span className="dot-sep">·</span>
            <span>{meta.label}</span>
            {subscription.account && (
              <>
                <span className="dot-sep">·</span>
                <span className="sub-account"><span className="sub-account-dot" style={{ background: subscription.account.color }} />{subscription.account.name}</span>
              </>
            )}
          </div>
          {subscription.notes && <p className="sub-notes">{subscription.notes}</p>}
        </div>
        <div className="sub-billing">
          <strong>{formatMoney(subscription.amount, currency, { decimals: 2 })}</strong>
          <span>{formatMoney(subscription.monthlyAmount, currency, { decimals: 2 })}/mo</span>
        </div>
        <div className="sub-due">
          <span className={`due-chip ${subscription.active ? dueTone(subscription.daysUntil) : ''}`}>
            <CalendarDays size={12} />
            {formatDate(subscription.nextDate, 'MMM d')}
          </span>
          <span className="muted small">{subscription.active ? dueText(subscription.daysUntil) : 'Paused'}</span>
        </div>
        <div className="row-actions">
          <IconButton label={`Edit ${subscription.name}`} onClick={() => openEdit(subscription)}>
            <Pencil size={15} />
          </IconButton>
          <IconButton
            label={subscription.active ? `Pause ${subscription.name}` : `Resume ${subscription.name}`}
            onClick={() => handleToggle(subscription)}
            disabled={toggling === subscription.id}
          >
            {subscription.active ? <Pause size={15} /> : <Play size={15} />}
          </IconButton>
          <IconButton label={`Delete ${subscription.name}`} tone="danger" onClick={() => setDeleting(subscription)}>
            <Trash2 size={15} />
          </IconButton>
        </div>
      </div>
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="Recurring charges"
        title="Subscriptions"
        subtitle="Know what renews, when it renews, and what it really costs."
        actions={(
          <Button variant="primary" iconLeft={<Plus size={16} />} onClick={openCreate}>
            Add subscription
          </Button>
        )}
      />

      <div className="stat-grid">
        <Card className="stat-card">
          <div className="stat-top">
            <span className="stat-icon tone-mint"><RefreshCcw size={18} /></span>
            <span className="stat-label">Monthly cost</span>
          </div>
          <strong className="stat-value">{formatMoney(summary.monthlyTotal, currency, { decimals: 2 })}</strong>
          <div className="stat-foot"><span className="muted">Across {summary.activeCount} active subscription{summary.activeCount === 1 ? '' : 's'}</span></div>
        </Card>
        <Card className="stat-card">
          <div className="stat-top">
            <span className="stat-icon tone-sky"><CalendarDays size={18} /></span>
            <span className="stat-label">Yearly cost</span>
          </div>
          <strong className="stat-value">{formatMoney(summary.yearlyTotal, currency, { decimals: 0 })}</strong>
          <div className="stat-foot"><span className="muted">If nothing changes</span></div>
        </Card>
        <Card className="stat-card">
          <div className="stat-top">
            <span className="stat-icon tone-amber"><CreditCard size={18} /></span>
            <span className="stat-label">Due this week</span>
          </div>
          <strong className="stat-value">{summary.dueThisWeek}</strong>
          <div className="stat-foot"><span className="muted">{summary.dueThisMonth} in the next 30 days</span></div>
        </Card>
        <Card className="stat-card">
          <div className="stat-top">
            <span className="stat-icon tone-pink"><Pause size={18} /></span>
            <span className="stat-label">Paused</span>
          </div>
          <strong className="stat-value">{pausedItems.length}</strong>
          <div className="stat-foot"><span className="muted">Excluded from totals</span></div>
        </Card>
      </div>

      {loading && !data ? (
        <div className="sub-list">
          {[0, 1, 2, 3].map((index) => (
            <Card key={index}><Skeleton width="40%" height={18} /><Skeleton height={44} className="skeleton-gap" /></Card>
          ))}
        </div>
      ) : items.length ? (
        <>
          <Card>
            <CardHeader
              title="Active subscriptions"
              subtitle={`${summary.activeCount} renewing · ${formatMoney(summary.monthlyTotal, currency, { decimals: 2 })} a month`}
              action={<span className="muted small">{formatMoney(summary.yearlyTotal, currency, { decimals: 0 })} / year</span>}
            />
            {activeItems.length ? (
              <div className="sub-list">{activeItems.map(renderRow)}</div>
            ) : (
              <EmptyState
                compact
                icon={RefreshCcw}
                title="Nothing active"
                message="Add a subscription to keep an eye on renewals."
                action={<Button size="sm" variant="secondary" iconLeft={<Plus size={14} />} onClick={openCreate}>Add subscription</Button>}
              />
            )}
          </Card>

          {pausedItems.length > 0 && (
            <Card>
              <CardHeader
                title="Paused"
                subtitle="Still on file, but not counted in your totals"
              />
              <div className="sub-list">{pausedItems.map(renderRow)}</div>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <EmptyState
            icon={RefreshCcw}
            title="No subscriptions tracked"
            message="Add streaming, software, gym or any recurring charge so renewals never surprise you."
            action={<Button variant="primary" iconLeft={<Plus size={15} />} onClick={openCreate}>Add your first subscription</Button>}
          />
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={saving ? () => undefined : () => setModalOpen(false)}
        title={editing ? 'Edit subscription' : 'New subscription'}
        subtitle={editing ? 'Update the charge details or billing cycle.' : 'Track any recurring charge that renews.'}
        size="md"
        footer={(
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              {editing ? 'Save changes' : 'Add subscription'}
            </Button>
          </>
        )}
      >
        <div className="form-stack">
          {formError && <div className="form-error">{formError}</div>}
          <Field label="Name">
            <Input
              placeholder="e.g. Netflix"
              value={name}
              maxLength={60}
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
          </Field>
          <div className="form-grid">
            <Field label="Amount">
              <Input
                prefix={currencySymbol(currency)}
                type="number"
                min="0.01"
                step="0.01"
                placeholder="15.99"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </Field>
            <Field label="Category">
              <Select value={category} onChange={(event) => setCategory(event.target.value)}>
                {EXPENSE_CATEGORIES.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="form-grid">
            <Field label="Billing cycle">
              <Select value={frequency} onChange={(event) => setFrequency(event.target.value)}>
                {FREQUENCIES.map((item) => (
                  <option key={item} value={item}>{FREQUENCY_LABELS[item]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Next charge date">
              <Input type="date" value={nextDate} onChange={(event) => setNextDate(event.target.value)} />
            </Field>
          </div>
          <Field label="Paid from" hint="Optional">
            <Select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
              <option value="">No account linked</option>
              {activeAccounts.map((account) => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Notes" hint="Optional">
            <Textarea
              rows={2}
              maxLength={120}
              placeholder="e.g. Shared family plan"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
          <div className="switch-row">
            <div>
              <strong>Active</strong>
              <p className="muted small">Paused subscriptions stay on file but are excluded from totals.</p>
            </div>
            <Switch checked={active} onChange={setActive} label="Subscription active" />
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete subscription?"
        message={<p><strong>{deleting?.name}</strong> will be removed from your tracked subscriptions. Past transactions stay untouched.</p>}
        confirmLabel="Delete subscription"
      />
    </>
  );
}
