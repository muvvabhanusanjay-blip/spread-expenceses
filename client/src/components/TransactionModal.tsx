import { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Field, Input, Select, Textarea } from './ui/Forms';
import { api, ApiError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { notifyDataChanged } from '../lib/hooks';
import { currencySymbol, todayISO } from '../lib/format';
import { ACCOUNT_TYPE_LABELS, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../lib/categories';
import type { Account, Transaction, TransactionDraft, TransactionType } from '../lib/types';

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
  defaultAccountId?: string;
  defaultType?: TransactionType;
  onSaved?: () => void;
}

const TYPE_OPTIONS: { value: TransactionType; label: string; icon: typeof ArrowUpRight }[] = [
  { value: 'expense', label: 'Expense', icon: ArrowUpRight },
  { value: 'income', label: 'Income', icon: ArrowDownLeft },
  { value: 'transfer', label: 'Transfer', icon: ArrowLeftRight },
];

export function TransactionModal({
  open,
  onClose,
  transaction = null,
  defaultAccountId,
  defaultType = 'expense',
  onSaved,
}: TransactionModalProps) {
  const { user } = useAuth();
  const toast = useToast();
  const currency = user?.currency || 'USD';

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [type, setType] = useState<TransactionType>(defaultType);
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [category, setCategory] = useState('groceries');
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISO());
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const activeAccounts = accounts.filter((account) => !account.isArchived);
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  useEffect(() => {
    if (!open) return;
    let active = true;
    setAccountsLoading(true);
    api
      .accounts()
      .then((response) => {
        if (!active) return;
        const list = response.accounts.filter((account) => !account.isArchived);
        setAccounts(response.accounts);
        if (transaction) {
          setAccountId(transaction.account?.id || list[0]?.id || '');
          setToAccountId(transaction.toAccount?.id || '');
        } else {
          setAccountId(defaultAccountId || list[0]?.id || '');
          setToAccountId(list[1]?.id || '');
        }
      })
      .catch((err) => {
        if (active) toast.error('Could not load accounts', err instanceof Error ? err.message : undefined);
      })
      .finally(() => {
        if (active) setAccountsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, transaction, defaultAccountId, toast]);

  useEffect(() => {
    if (!open) return;
    if (transaction) {
      setType(transaction.type);
      setAmount(String(transaction.amount));
      setCategory(transaction.category);
      setMerchant(transaction.merchant);
      setNote(transaction.note);
      setDate(transaction.date);
      setTags(transaction.tags.join(', '));
    } else {
      setType(defaultType);
      setAmount('');
      setCategory(defaultType === 'income' ? 'salary' : defaultType === 'transfer' ? 'transfer' : 'groceries');
      setMerchant('');
      setNote('');
      setDate(todayISO());
      setTags('');
    }
    setError('');
  }, [open, transaction, defaultType]);

  useEffect(() => {
    if (!open) return;
    if (type === 'transfer') {
      setCategory('transfer');
    } else {
      const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
      if (!list.some((item) => item.id === category)) setCategory(list[0].id);
    }
  }, [type, open, category]);

  const changeType = (next: TransactionType) => {
    setType(next);
    setError('');
    if (next === 'transfer') {
      const fallbackTo = activeAccounts.find((account) => account.id !== accountId)?.id || '';
      setToAccountId((current) => current || fallbackTo);
    }
  };

  const handleSubmit = async () => {
    setError('');
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    if (!accountId) {
      setError('Choose an account.');
      return;
    }
    if (type === 'transfer' && (!toAccountId || toAccountId === accountId)) {
      setError('Choose two different accounts for a transfer.');
      return;
    }

    const draft: TransactionDraft = {
      type,
      amount: Math.round(numericAmount * 100) / 100,
      account: accountId,
      category: type === 'transfer' ? 'transfer' : category,
      merchant: merchant.trim(),
      note: note.trim(),
      date,
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 6),
    };
    if (type === 'transfer') draft.toAccount = toAccountId;

    setSaving(true);
    try {
      if (transaction) {
        await api.updateTransaction(transaction.id, draft);
        toast.success('Transaction updated', `${draft.merchant || 'Transaction'} · ${date}`);
      } else {
        await api.createTransaction(draft);
        toast.success('Transaction added', `${draft.merchant || 'Transaction'} recorded.`);
      }
      notifyDataChanged();
      onSaved?.();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Could not save the transaction.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? () => undefined : onClose}
      title={transaction ? 'Edit transaction' : 'Add transaction'}
      subtitle={transaction ? 'Update the details below.' : 'Record money in, out, or between accounts.'}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving}>
            {transaction ? 'Save changes' : 'Add transaction'}
          </Button>
        </>
      )}
    >
      <div className="form-stack">
        <div className="segmented type-switch">
          {TYPE_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                className={`segment ${type === option.value ? 'is-active' : ''}`}
                onClick={() => changeType(option.value)}
              >
                <Icon size={15} />
                {option.label}
              </button>
            );
          })}
        </div>

        {error && <div className="form-error">{error}</div>}

        <Field label="Amount">
          <Input
            prefix={currencySymbol(currency)}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="amount-field"
            autoFocus
          />
        </Field>

        <div className="form-grid">
          <Field label={type === 'transfer' ? 'From account' : 'Account'}>
            <Select value={accountId} onChange={(event) => setAccountId(event.target.value)} disabled={accountsLoading}>
              {activeAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} · {ACCOUNT_TYPE_LABELS[account.type] || account.type}
                </option>
              ))}
            </Select>
          </Field>

          {type === 'transfer' ? (
            <Field label="To account">
              <Select value={toAccountId} onChange={(event) => setToAccountId(event.target.value)} disabled={accountsLoading}>
                <option value="">Select account</option>
                {activeAccounts.filter((account) => account.id !== accountId).map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} · {ACCOUNT_TYPE_LABELS[account.type] || account.type}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field label="Category">
              <Select value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </Select>
            </Field>
          )}
        </div>

        <div className="form-grid">
          <Field label="Date">
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} max={todayISO()} />
          </Field>
          <Field label={type === 'transfer' ? 'Description (optional)' : 'Merchant / payee'}>
            <Input
              placeholder={type === 'transfer' ? 'e.g. Monthly savings' : 'e.g. Whole Foods Market'}
              value={merchant}
              onChange={(event) => setMerchant(event.target.value)}
              maxLength={80}
            />
          </Field>
        </div>

        <Field label="Note (optional)">
          <Textarea
            rows={2}
            placeholder="Add context for future you"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={240}
          />
        </Field>

        <Field label="Tags (optional)" hint="Comma separated">
          <Input
            placeholder="essential, work, reimbursable"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
          />
        </Field>

        {!accountsLoading && activeAccounts.length === 0 && (
          <div className="form-error">Add an account before recording transactions.</div>
        )}
      </div>
    </Modal>
  );
}
