import { useEffect, useState } from 'react';
import {
  Archive, ArchiveRestore, ArrowDownLeft, ArrowUpRight, Landmark, Pencil, Plus, Trash2, WalletCards,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, ApiError } from '../lib/api';
import type { Account, AccountDraft, AccountsResponse } from '../lib/types';
import { notifyDataChanged, useDocumentTitle, useRefreshKey } from '../lib/hooks';
import { currencySymbol, formatMoney } from '../lib/format';
import { ACCOUNT_ICONS, ACCOUNT_TYPE_LABELS } from '../lib/categories';
import { PageHeader } from '../components/ui/PageHeader';
import { Button, IconButton } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Modal';
import { Field, Input, Select } from '../components/ui/Forms';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { TransactionModal } from '../components/TransactionModal';

const ACCOUNT_COLORS = ['#7C8CF8', '#3EE8A7', '#F472B6', '#FBBF24', '#38BDF8', '#A78BFA', '#2DD4BF', '#FB7185'];
const ACCOUNT_TYPES = ['checking', 'savings', 'credit', 'cash', 'investment'];

export function Accounts() {
  useDocumentTitle('Accounts');
  const { user } = useAuth();
  const toast = useToast();
  const currency = user?.currency || 'USD';
  const refreshKey = useRefreshKey();

  const [data, setData] = useState<AccountsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('checking');
  const [institution, setInstitution] = useState('');
  const [last4, setLast4] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [color, setColor] = useState(ACCOUNT_COLORS[0]);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<Account | null>(null);
  const [archiving, setArchiving] = useState<Account | null>(null);
  const [txAccount, setTxAccount] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .accounts()
      .then((response) => {
        if (active) setData(response);
      })
      .catch((err) => {
        if (active) toast.error('Could not load accounts', err instanceof ApiError ? err.message : undefined);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const accounts = data?.accounts || [];
  const activeAccounts = accounts.filter((account) => !account.isArchived);
  const archivedAccounts = accounts.filter((account) => account.isArchived);
  const summary = data?.summary || { netWorth: 0, assets: 0, liabilities: 0, activeCount: 0, archivedCount: 0 };

  const openCreate = () => {
    setEditing(null);
    setName('');
    setType('checking');
    setInstitution('');
    setLast4('');
    setOpeningBalance('');
    setColor(ACCOUNT_COLORS[activeAccounts.length % ACCOUNT_COLORS.length]);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (account: Account) => {
    setEditing(account);
    setName(account.name);
    setType(account.type);
    setInstitution(account.institution);
    setLast4(account.last4);
    setOpeningBalance(String(account.openingBalance));
    setColor(account.color);
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setFormError('');
    if (name.trim().length < 2) {
      setFormError('Give this account a name with at least two characters.');
      return;
    }
    if (last4 && !/^\d{1,4}$/.test(last4.trim())) {
      setFormError('Last 4 digits must be numbers only.');
      return;
    }
    const opening = Number(openingBalance || 0);
    if (!Number.isFinite(opening)) {
      setFormError('Enter a valid opening balance.');
      return;
    }

    const draft: AccountDraft = {
      name: name.trim(),
      type,
      institution: institution.trim(),
      last4: last4.trim(),
      openingBalance: opening,
      color,
    };

    setSaving(true);
    try {
      if (editing) {
        await api.updateAccount(editing.id, draft);
        toast.success('Account updated', `${draft.name} was saved.`);
      } else {
        await api.createAccount(draft);
        toast.success('Account added', `${draft.name} is ready for transactions.`);
      }
      setModalOpen(false);
      notifyDataChanged();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not save this account.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!archiving) return;
    try {
      await api.updateAccount(archiving.id, { isArchived: !archiving.isArchived });
      toast.success(archiving.isArchived ? 'Account restored' : 'Account archived', `${archiving.name} was ${archiving.isArchived ? 'moved back to active' : 'hidden from active balances'}.`);
      setArchiving(null);
      notifyDataChanged();
    } catch (err) {
      toast.error('Could not update account', err instanceof ApiError ? err.message : undefined);
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await api.deleteAccount(deleting.id);
      toast.success('Account deleted', `${deleting.name} was removed.`);
      setDeleting(null);
      notifyDataChanged();
    } catch (err) {
      toast.error('Could not delete account', err instanceof ApiError ? err.message : undefined);
      throw err;
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Where the money lives"
        title="Accounts"
        subtitle="Every balance in one calm, connected view."
        actions={(
          <Button variant="primary" iconLeft={<Plus size={16} />} onClick={openCreate}>
            Add account
          </Button>
        )}
      />

      <div className="stat-grid">
        <Card className="stat-card">
          <div className="stat-top">
            <span className="stat-icon tone-mint"><WalletCards size={18} /></span>
            <span className="stat-label">Net worth</span>
          </div>
          <strong className="stat-value">{formatMoney(summary.netWorth, currency, { decimals: 0 })}</strong>
          <div className="stat-foot">
            <span className="muted">{summary.activeCount} active account{summary.activeCount === 1 ? '' : 's'}</span>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-top">
            <span className="stat-icon tone-sky"><ArrowDownLeft size={18} /></span>
            <span className="stat-label">Assets</span>
          </div>
          <strong className="stat-value">{formatMoney(summary.assets, currency, { decimals: 0 })}</strong>
          <div className="stat-foot"><span className="muted">Positive balances</span></div>
        </Card>
        <Card className="stat-card">
          <div className="stat-top">
            <span className="stat-icon tone-pink"><ArrowUpRight size={18} /></span>
            <span className="stat-label">Liabilities</span>
          </div>
          <strong className="stat-value">{formatMoney(summary.liabilities, currency, { decimals: 0 })}</strong>
          <div className="stat-foot"><span className="muted">Credit and money owed</span></div>
        </Card>
        <Card className="stat-card">
          <div className="stat-top">
            <span className="stat-icon tone-amber"><Landmark size={18} /></span>
            <span className="stat-label">Archived</span>
          </div>
          <strong className="stat-value">{summary.archivedCount}</strong>
          <div className="stat-foot"><span className="muted">Excluded from net worth</span></div>
        </Card>
      </div>

      {loading && !data ? (
        <div className="accounts-grid">
          {[0, 1, 2, 3].map((index) => (
            <Card key={index}><Skeleton width="45%" height={20} /><Skeleton height={70} className="skeleton-gap" /><Skeleton height={8} /></Card>
          ))}
        </div>
      ) : activeAccounts.length ? (
        <div className="accounts-grid">
          {activeAccounts.map((account) => {
            const Icon = ACCOUNT_ICONS[account.type] || WalletCards;
            return (
              <Card key={account.id} className="account-card">
                <div className="account-card-head">
                  <span
                    className="account-icon"
                    style={{ background: `color-mix(in srgb, ${account.color} 15%, transparent)`, color: account.color }}
                  >
                    <Icon size={21} />
                  </span>
                  <div className="account-card-title">
                    <strong>{account.name}</strong>
                    <span>
                      {ACCOUNT_TYPE_LABELS[account.type] || account.type}
                      {account.institution ? ` · ${account.institution}` : ''}
                      {account.last4 ? ` · ••${account.last4}` : ''}
                    </span>
                  </div>
                  <div className="row-actions">
                    <IconButton label={`Edit ${account.name}`} onClick={() => openEdit(account)}>
                      <Pencil size={15} />
                    </IconButton>
                    <IconButton label={`Archive ${account.name}`} onClick={() => setArchiving(account)}>
                      <Archive size={15} />
                    </IconButton>
                    <IconButton label={`Delete ${account.name}`} tone="danger" onClick={() => setDeleting(account)}>
                      <Trash2 size={15} />
                    </IconButton>
                  </div>
                </div>

                <div className="account-balance">
                  <span>Current balance</span>
                  <strong className={account.balance < 0 ? 'value-negative' : ''}>
                    {formatMoney(account.balance, currency, { decimals: 2 })}
                  </strong>
                </div>

                <div className="account-flow">
                  <div>
                    <span className="flow-label flow-in"><ArrowDownLeft size={12} /> In this month</span>
                    <strong>{formatMoney(account.monthIn, currency, { decimals: 0 })}</strong>
                  </div>
                  <div>
                    <span className="flow-label flow-out"><ArrowUpRight size={12} /> Out this month</span>
                    <strong>{formatMoney(account.monthOut, currency, { decimals: 0 })}</strong>
                  </div>
                </div>

                <div className="account-card-foot">
                  <span className="muted small">{account.txCount} transaction{account.txCount === 1 ? '' : 's'}</span>
                  <Button size="sm" variant="secondary" iconLeft={<Plus size={14} />} onClick={() => setTxAccount(account.id)}>
                    Add transaction
                  </Button>
                </div>
              </Card>
            );
          })}

          <button type="button" className="account-add-card" onClick={openCreate}>
            <span className="budget-add-icon"><Plus size={20} /></span>
            <strong>Link another account</strong>
            <span>Checking, savings, credit or cash</span>
          </button>
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={WalletCards}
            title="No accounts yet"
            message="Add a checking, savings, credit or cash account to start tracking balances and transactions."
            action={<Button variant="primary" iconLeft={<Plus size={15} />} onClick={openCreate}>Add your first account</Button>}
          />
        </Card>
      )}

      {archivedAccounts.length > 0 && (
        <Card className="archived-card">
          <CardHeader
            title="Archived accounts"
            subtitle="Kept for history, hidden from your net worth"
          />
          <div className="archived-list">
            {archivedAccounts.map((account) => {
              const Icon = ACCOUNT_ICONS[account.type] || WalletCards;
              return (
                <div className="archived-row" key={account.id}>
                  <span className="account-icon account-icon-sm" style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}>
                    <Icon size={16} />
                  </span>
                  <div className="account-card-title">
                    <strong>{account.name}</strong>
                    <span>{ACCOUNT_TYPE_LABELS[account.type] || account.type} · {account.txCount} transactions</span>
                  </div>
                  <span className="muted">{formatMoney(account.balance, currency, { decimals: 0 })}</span>
                  <Button size="sm" variant="ghost" iconLeft={<ArchiveRestore size={14} />} onClick={() => setArchiving(account)}>
                    Restore
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={saving ? () => undefined : () => setModalOpen(false)}
        title={editing ? 'Edit account' : 'New account'}
        subtitle={editing ? 'Update the details or opening balance.' : 'Add a place where your money lives.'}
        size="md"
        footer={(
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              {editing ? 'Save changes' : 'Add account'}
            </Button>
          </>
        )}
      >
        <div className="form-stack">
          {formError && <div className="form-error">{formError}</div>}
          <div className="form-grid">
            <Field label="Account name">
              <Input
                placeholder="Everyday Checking"
                value={name}
                maxLength={60}
                onChange={(event) => setName(event.target.value)}
                autoFocus
              />
            </Field>
            <Field label="Type">
              <Select value={type} onChange={(event) => setType(event.target.value)}>
                {ACCOUNT_TYPES.map((option) => (
                  <option key={option} value={option}>{ACCOUNT_TYPE_LABELS[option]}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="form-grid">
            <Field label="Institution" hint="Optional">
              <Input
                placeholder="e.g. Meridian Bank"
                value={institution}
                maxLength={60}
                onChange={(event) => setInstitution(event.target.value)}
              />
            </Field>
            <Field label="Last 4 digits" hint="Optional">
              <Input
                placeholder="4821"
                inputMode="numeric"
                maxLength={4}
                value={last4}
                onChange={(event) => setLast4(event.target.value.replace(/\D/g, ''))}
              />
            </Field>
          </div>
          <Field
            label="Opening balance"
            hint={editing ? 'Adjusts the balance baseline' : 'Current starting point'}
          >
            <Input
              prefix={currencySymbol(currency)}
              type="number"
              step="0.01"
              placeholder="0"
              value={openingBalance}
              onChange={(event) => setOpeningBalance(event.target.value)}
            />
          </Field>
          <Field label="Colour">
            <div className="swatch-row">
              {ACCOUNT_COLORS.map((swatch) => (
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
        </div>
      </Modal>

      <TransactionModal
        open={Boolean(txAccount)}
        onClose={() => setTxAccount(null)}
        defaultAccountId={txAccount || undefined}
      />

      <ConfirmModal
        open={Boolean(archiving)}
        onClose={() => setArchiving(null)}
        onConfirm={handleArchive}
        tone="primary"
        title={archiving?.isArchived ? 'Restore account?' : 'Archive account?'}
        message={(
          <p>
            <strong>{archiving?.name}</strong>{' '}
            {archiving?.isArchived
              ? 'will return to your active accounts and net worth.'
              : 'will be hidden from active balances and net worth. Its transactions stay intact and you can restore it any time.'}
          </p>
        )}
        confirmLabel={archiving?.isArchived ? 'Restore account' : 'Archive account'}
      />

      <ConfirmModal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete account?"
        message={(
          <p>
            <strong>{deleting?.name}</strong> will be permanently removed. Accounts with transactions can't be deleted — archive them instead.
          </p>
        )}
        confirmLabel="Delete account"
      />
    </>
  );
}
