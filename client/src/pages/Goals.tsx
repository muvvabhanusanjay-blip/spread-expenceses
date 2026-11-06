import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, ChevronDown, ChevronUp, History, Pencil, Plus, Target, Trash2, Wallet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, ApiError } from '../lib/api';
import type { Goal, GoalDraft, GoalsResponse } from '../lib/types';
import { notifyDataChanged, useDocumentTitle, useRefreshKey } from '../lib/hooks';
import { currencySymbol, formatDate, formatMoney, formatPercent, todayISO } from '../lib/format';
import { GOAL_ICONS } from '../lib/categories';
import { PageHeader } from '../components/ui/PageHeader';
import { Button, IconButton } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ProgressBar, ProgressRing } from '../components/ui/Progress';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Modal';
import { Field, Input, Textarea } from '../components/ui/Forms';
import { ConfirmModal } from '../components/ui/ConfirmModal';

const GOAL_COLORS = ['#3EE8A7', '#7C8CF8', '#F472B6', '#FBBF24', '#38BDF8', '#A78BFA', '#2DD4BF', '#FB7185'];
const ICON_KEYS = Object.keys(GOAL_ICONS);

interface ContributionTarget {
  goalId: string;
  contributionId: string;
  amount: number;
  goalName: string;
}

export function Goals() {
  useDocumentTitle('Goals');
  const { user } = useAuth();
  const toast = useToast();
  const currency = user?.currency || 'USD';
  const refreshKey = useRefreshKey();

  const [data, setData] = useState<GoalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [openHistory, setOpenHistory] = useState<Record<string, boolean>>({});

  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [color, setColor] = useState(GOAL_COLORS[0]);
  const [icon, setIcon] = useState('target');
  const [initialAmount, setInitialAmount] = useState('');
  const [goalError, setGoalError] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  const [fundingGoal, setFundingGoal] = useState<Goal | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [fundDate, setFundDate] = useState(todayISO());
  const [fundNote, setFundNote] = useState('');
  const [fundError, setFundError] = useState('');
  const [savingFunds, setSavingFunds] = useState(false);

  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);
  const [deletingContribution, setDeletingContribution] = useState<ContributionTarget | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .goals()
      .then((response) => {
        if (active) setData(response);
      })
      .catch((err) => {
        if (active) toast.error('Could not load goals', err instanceof ApiError ? err.message : undefined);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const goals = data?.goals || [];
  const summary = data?.summary || { count: 0, totalSaved: 0, totalTarget: 0, pct: 0 };
  const funded = goals.filter((goal) => goal.pct >= 100).length;
  const needAttention = goals.filter((goal) => goal.pct < 100 && goal.daysLeft != null && goal.daysLeft <= 30).length;

  const sortedGoals = useMemo(
    () => [...goals].sort((a, b) => {
      const doneA = a.pct >= 100 ? 1 : 0;
      const doneB = b.pct >= 100 ? 1 : 0;
      if (doneA !== doneB) return doneA - doneB;
      return b.pct - a.pct;
    }),
    [goals]
  );

  const openCreate = () => {
    setEditing(null);
    setName('');
    setTargetAmount('');
    setDeadline('');
    setColor(GOAL_COLORS[goals.length % GOAL_COLORS.length]);
    setIcon('target');
    setInitialAmount('');
    setGoalError('');
    setGoalModalOpen(true);
  };

  const openEdit = (goal: Goal) => {
    setEditing(goal);
    setName(goal.name);
    setTargetAmount(String(goal.targetAmount));
    setDeadline(goal.deadline || '');
    setColor(goal.color);
    setIcon(goal.icon);
    setInitialAmount('');
    setGoalError('');
    setGoalModalOpen(true);
  };

  const openFunds = (goal: Goal) => {
    setFundingGoal(goal);
    setFundAmount('');
    setFundDate(todayISO());
    setFundNote('');
    setFundError('');
  };

  const handleSaveGoal = async () => {
    setGoalError('');
    const target = Number(targetAmount);
    if (name.trim().length < 2) {
      setGoalError('Give your goal a name with at least two characters.');
      return;
    }
    if (!Number.isFinite(target) || target <= 0) {
      setGoalError('Enter a target amount greater than zero.');
      return;
    }
    const starting = initialAmount ? Number(initialAmount) : 0;
    if (initialAmount && (!Number.isFinite(starting) || starting < 0)) {
      setGoalError('The starting amount must be zero or more.');
      return;
    }

    setSavingGoal(true);
    try {
      if (editing) {
        const body: Partial<GoalDraft> = {
          name: name.trim(),
          targetAmount: target,
          deadline: deadline || null,
          color,
          icon,
        };
        await api.updateGoal(editing.id, body);
        toast.success('Goal updated', `${name.trim()} is now tracking ${formatMoney(target, currency, { decimals: 0 })}.`);
      } else {
        await api.createGoal({
          name: name.trim(),
          targetAmount: target,
          deadline: deadline || null,
          color,
          icon,
          initialAmount: starting > 0 ? starting : undefined,
        });
        toast.success('Goal created', `Start adding funds toward ${name.trim()}.`);
      }
      setGoalModalOpen(false);
      notifyDataChanged();
    } catch (err) {
      setGoalError(err instanceof ApiError ? err.message : 'Could not save this goal.');
    } finally {
      setSavingGoal(false);
    }
  };

  const handleAddFunds = async () => {
    if (!fundingGoal) return;
    setFundError('');
    const amount = Number(fundAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFundError('Enter an amount greater than zero.');
      return;
    }
    setSavingFunds(true);
    try {
      await api.addContribution(fundingGoal.id, {
        amount,
        date: fundDate || todayISO(),
        note: fundNote.trim() || undefined,
      });
      toast.success('Funds added', `${formatMoney(amount, currency, { decimals: 2 })} went to ${fundingGoal.name}.`);
      setFundingGoal(null);
      notifyDataChanged();
    } catch (err) {
      setFundError(err instanceof ApiError ? err.message : 'Could not add these funds.');
    } finally {
      setSavingFunds(false);
    }
  };

  const handleDeleteGoal = async () => {
    if (!deletingGoal) return;
    try {
      await api.deleteGoal(deletingGoal.id);
      toast.success('Goal deleted', `${deletingGoal.name} and its contribution history were removed.`);
      setDeletingGoal(null);
      notifyDataChanged();
    } catch (err) {
      toast.error('Could not delete goal', err instanceof ApiError ? err.message : undefined);
      throw err;
    }
  };

  const handleDeleteContribution = async () => {
    if (!deletingContribution) return;
    try {
      await api.deleteContribution(deletingContribution.goalId, deletingContribution.contributionId);
      toast.success('Contribution removed', `${formatMoney(deletingContribution.amount, currency, { decimals: 2 })} was taken out of ${deletingContribution.goalName}.`);
      setDeletingContribution(null);
      notifyDataChanged();
    } catch (err) {
      toast.error('Could not remove contribution', err instanceof ApiError ? err.message : undefined);
      throw err;
    }
  };

  const deadlineTone = (goal: Goal) => {
    if (goal.pct >= 100) return 'is-complete';
    if (goal.daysLeft == null) return '';
    if (goal.daysLeft < 0) return 'is-overdue';
    if (goal.daysLeft <= 30) return 'is-soon';
    return '';
  };

  return (
    <>
      <PageHeader
        eyebrow="Savings ambitions"
        title="Goals"
        subtitle="Give every dream a number, then watch it get closer."
        actions={(
          <Button variant="primary" iconLeft={<Plus size={16} />} onClick={openCreate}>
            New goal
          </Button>
        )}
      />

      {loading && !data ? (
        <>
          <Card><Skeleton height={210} radius={18} /></Card>
          <div className="goal-grid">
            {[0, 1, 2].map((index) => (
              <Card key={index}><Skeleton width="55%" height={20} /><Skeleton height={90} className="skeleton-gap" /><Skeleton height={8} /></Card>
            ))}
          </div>
        </>
      ) : goals.length ? (
        <>
          <Card className="goal-hero">
            <div className="goal-hero-ring">
              <ProgressRing value={Math.min(100, summary.pct)} size={168} stroke={11} color="var(--accent)">
                <div className="ring-caption">
                  <strong>{formatPercent(summary.pct, 0)}</strong>
                  <span>funded</span>
                </div>
              </ProgressRing>
            </div>
            <div className="goal-hero-copy">
              <span className="eyebrow">All goals combined</span>
              <h2>{formatMoney(summary.totalSaved, currency, { decimals: 0 })} <span>of {formatMoney(summary.totalTarget, currency, { decimals: 0 })}</span></h2>
              <p>
                {summary.totalTarget - summary.totalSaved > 0
                  ? `${formatMoney(summary.totalTarget - summary.totalSaved, currency, { decimals: 0 })} to go across ${summary.count} goal${summary.count === 1 ? '' : 's'}.`
                  : 'Every goal is fully funded. Time to celebrate.'}
              </p>
              <div className="goal-hero-metrics">
                <div>
                  <span>Active goals</span>
                  <strong>{summary.count}</strong>
                </div>
                <div>
                  <span>Funded</span>
                  <strong>{funded}</strong>
                </div>
                <div>
                  <span>Needs attention</span>
                  <strong className={needAttention ? 'value-negative' : ''}>{needAttention}</strong>
                </div>
              </div>
            </div>
          </Card>

          <div className="goal-grid">
            {sortedGoals.map((goal) => {
              const Icon = GOAL_ICONS[goal.icon] || Target;
              const complete = goal.pct >= 100;
              const expanded = Boolean(openHistory[goal.id]);
              return (
                <Card key={goal.id} className={`goal-card ${complete ? 'is-complete' : ''}`}>
                  <div className="goal-card-head">
                    <span className="goal-icon" style={{ background: `color-mix(in srgb, ${goal.color} 16%, transparent)`, color: goal.color }}>
                      <Icon size={21} />
                    </span>
                    <div className="goal-card-title">
                      <strong>{goal.name}</strong>
                      <span className={deadlineTone(goal)}>
                        <CalendarDays size={12} />
                        {goal.deadline
                          ? goal.daysLeft != null && goal.daysLeft >= 0
                            ? `${formatDate(goal.deadline, 'MMM d, yyyy')} · ${goal.daysLeft}d left`
                            : `${formatDate(goal.deadline, 'MMM d, yyyy')} · target date passed`
                          : 'No deadline'}
                      </span>
                    </div>
                    <div className="row-actions">
                      <IconButton label={`Edit ${goal.name}`} onClick={() => openEdit(goal)}>
                        <Pencil size={15} />
                      </IconButton>
                      <IconButton label={`Delete ${goal.name}`} tone="danger" onClick={() => setDeletingGoal(goal)}>
                        <Trash2 size={15} />
                      </IconButton>
                    </div>
                  </div>

                  <div className="goal-card-amounts">
                    <div>
                      <span>Saved</span>
                      <strong style={{ color: goal.color }}>{formatMoney(goal.saved, currency, { decimals: 0 })}</strong>
                    </div>
                    <div className="goal-card-of">
                      <span>Target</span>
                      <strong>{formatMoney(goal.targetAmount, currency, { decimals: 0 })}</strong>
                    </div>
                  </div>

                  <ProgressBar value={Math.min(100, goal.pct)} color={goal.color} height={9} />
                  <div className="goal-card-foot">
                    <span className={`budget-badge ${complete || goal.pct < 50 ? 'is-ok' : 'is-near'}`}>
                      {complete ? 'Fully funded' : `${formatPercent(goal.pct, 0)} complete`}
                    </span>
                    <span className="muted small">
                      {complete
                        ? 'Goal reached'
                        : goal.monthlyNeeded > 0
                          ? `${formatMoney(goal.monthlyNeeded, currency, { decimals: 0 })}/mo to finish on time`
                          : `${formatMoney(goal.remaining, currency, { decimals: 0 })} remaining`}
                    </span>
                  </div>

                  <div className="goal-card-actions">
                    <Button size="sm" variant="primary" iconLeft={<Plus size={14} />} onClick={() => openFunds(goal)}>
                      Add funds
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      iconLeft={<History size={14} />}
                      iconRight={expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      onClick={() => setOpenHistory((current) => ({ ...current, [goal.id]: !current[goal.id] }))}
                    >
                      History{goal.contributionCount ? ` (${goal.contributionCount})` : ''}
                    </Button>
                  </div>

                  {expanded && (
                    <div className="goal-history">
                      {goal.contributions.length ? (
                        goal.contributions.map((contribution) => (
                          <div className="goal-history-row" key={contribution.id}>
                            <span className="goal-history-dot" style={{ background: goal.color }} />
                            <div>
                              <strong>{formatMoney(contribution.amount, currency, { decimals: 2 })}</strong>
                              <span>{formatDate(contribution.date, 'MMM d, yyyy')}{contribution.note ? ` · ${contribution.note}` : ''}</span>
                            </div>
                            <IconButton
                              label="Remove contribution"
                              tone="danger"
                              onClick={() => setDeletingContribution({
                                goalId: goal.id,
                                contributionId: contribution.id,
                                amount: contribution.amount,
                                goalName: goal.name,
                              })}
                            >
                              <Trash2 size={14} />
                            </IconButton>
                          </div>
                        ))
                      ) : (
                        <p className="muted small">No contributions yet — add your first one.</p>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}

            <button type="button" className="goal-add-card" onClick={openCreate}>
              <span className="budget-add-icon"><Target size={20} /></span>
              <strong>Start a new goal</strong>
              <span>Dreams like plans</span>
            </button>
          </div>
        </>
      ) : (
        <Card>
          <EmptyState
            icon={Target}
            title="What are you saving for?"
            message="A trip, a new laptop, a calmer emergency fund — set a target and add funds as you go."
            action={<Button variant="primary" iconLeft={<Plus size={15} />} onClick={openCreate}>Create your first goal</Button>}
          />
        </Card>
      )}

      <Modal
        open={goalModalOpen}
        onClose={savingGoal ? () => undefined : () => setGoalModalOpen(false)}
        title={editing ? 'Edit goal' : 'New savings goal'}
        subtitle={editing ? 'Adjust the name, target or deadline.' : 'Name it, price it, and pick a look you love.'}
        size="md"
        footer={(
          <>
            <Button variant="ghost" onClick={() => setGoalModalOpen(false)} disabled={savingGoal}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveGoal} loading={savingGoal}>
              {editing ? 'Save changes' : 'Create goal'}
            </Button>
          </>
        )}
      >
        <div className="form-stack">
          {goalError && <div className="form-error">{goalError}</div>}
          <Field label="Goal name">
            <Input
              placeholder="e.g. Japan trip"
              value={name}
              maxLength={60}
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
          </Field>
          <div className="form-grid">
            <Field label="Target amount">
              <Input
                prefix={currencySymbol(currency)}
                type="number"
                min="1"
                step="1"
                placeholder="5000"
                value={targetAmount}
                onChange={(event) => setTargetAmount(event.target.value)}
              />
            </Field>
            <Field label="Target date" hint="Optional">
              <Input
                type="date"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
              />
            </Field>
          </div>
          {!editing && (
            <Field label="Starting amount" hint="Optional">
              <Input
                prefix={currencySymbol(currency)}
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={initialAmount}
                onChange={(event) => setInitialAmount(event.target.value)}
              />
            </Field>
          )}
          <Field label="Colour">
            <div className="swatch-row">
              {GOAL_COLORS.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  className={`swatch ${color === swatch ? 'is-selected' : ''}`}
                  style={{ background: swatch }}
                  aria-label={`Use colour ${swatch}`}
                  onClick={() => setColor(swatch)}
                />
              ))}
            </div>
          </Field>
          <Field label="Icon">
            <div className="icon-picker">
              {ICON_KEYS.map((key) => {
                const Icon = GOAL_ICONS[key];
                return (
                  <button
                    key={key}
                    type="button"
                    className={`icon-option ${icon === key ? 'is-selected' : ''}`}
                    onClick={() => setIcon(key)}
                    aria-label={`Use ${key} icon`}
                  >
                    <Icon size={17} />
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(fundingGoal)}
        onClose={savingFunds ? () => undefined : () => setFundingGoal(null)}
        title={fundingGoal ? `Add funds to ${fundingGoal.name}` : 'Add funds'}
        subtitle={fundingGoal
          ? `${formatMoney(fundingGoal.remaining, currency, { decimals: 0 })} remaining toward the target.`
          : undefined}
        size="sm"
        footer={(
          <>
            <Button variant="ghost" onClick={() => setFundingGoal(null)} disabled={savingFunds}>Cancel</Button>
            <Button variant="primary" onClick={handleAddFunds} loading={savingFunds} iconLeft={<Wallet size={15} />}>
              Add funds
            </Button>
          </>
        )}
      >
        <div className="form-stack">
          {fundError && <div className="form-error">{fundError}</div>}
          <Field label="Amount">
            <Input
              prefix={currencySymbol(currency)}
              type="number"
              min="0.01"
              step="0.01"
              placeholder="250"
              value={fundAmount}
              onChange={(event) => setFundAmount(event.target.value)}
              autoFocus
            />
          </Field>
          <Field label="Date">
            <Input type="date" value={fundDate} onChange={(event) => setFundDate(event.target.value)} />
          </Field>
          <Field label="Note" hint="Optional">
            <Textarea
              rows={2}
              maxLength={120}
              placeholder="e.g. Monthly transfer"
              value={fundNote}
              onChange={(event) => setFundNote(event.target.value)}
            />
          </Field>
          {fundingGoal && (
            <div className="form-hint-card">
              <Target size={16} />
              <p>
                After this contribution the goal will be at{' '}
                <strong>
                  {formatPercent(
                    Math.min(100, ((fundingGoal.saved + (Number(fundAmount) || 0)) / fundingGoal.targetAmount) * 100),
                    0
                  )}
                </strong>{' '}
                of its target.
              </p>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmModal
        open={Boolean(deletingGoal)}
        onClose={() => setDeletingGoal(null)}
        onConfirm={handleDeleteGoal}
        title="Delete goal?"
        message={<p><strong>{deletingGoal?.name}</strong> and all of its contribution history will be removed. This cannot be undone.</p>}
        confirmLabel="Delete goal"
      />

      <ConfirmModal
        open={Boolean(deletingContribution)}
        onClose={() => setDeletingContribution(null)}
        onConfirm={handleDeleteContribution}
        title="Remove contribution?"
        message={(
          <p>
            <strong>{deletingContribution ? formatMoney(deletingContribution.amount, currency, { decimals: 2 }) : ''}</strong>{' '}
            will be removed from <strong>{deletingContribution?.goalName}</strong>. The underlying transaction, if any, stays untouched.
          </p>
        )}
        confirmLabel="Remove contribution"
      />
    </>
  );
}
