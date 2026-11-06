import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, Plus, ReceiptText, Search, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, ApiError, downloadTransactionsCsv } from '../lib/api';
import type { Account, Transaction, TransactionsResponse, TransactionType } from '../lib/types';
import { useDebouncedValue, useDocumentTitle, useRefreshKey } from '../lib/hooks';
import {
  currentMonthKey, formatDayHeading, formatMoney, formatPercent, monthOptions,
} from '../lib/format';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../lib/categories';
import { PageHeader } from '../components/ui/PageHeader';
import { Button, IconButton } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Forms';
import { EmptyState } from '../components/ui/EmptyState';
import { TransactionRow } from '../components/ui/TransactionRow';
import { SkeletonRows } from '../components/ui/Skeleton';
import { TransactionModal } from '../components/TransactionModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';

const TYPE_OPTIONS: { value: 'all' | TransactionType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Expenses' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfers' },
];

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest first' },
  { value: 'date_asc', label: 'Oldest first' },
  { value: 'amount_desc', label: 'Highest amount' },
  { value: 'amount_asc', label: 'Lowest amount' },
];

export function Transactions() {
  useDocumentTitle('Transactions');
  const { user } = useAuth();
  const toast = useToast();
  const currency = user?.currency || 'USD';

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [type, setType] = useState<'all' | TransactionType>('all');
  const [category, setCategory] = useState('all');
  const [account, setAccount] = useState('all');
  const [month, setMonth] = useState(currentMonthKey());
  const [sort, setSort] = useState('date_desc');
  const [page, setPage] = useState(1);

  const [data, setData] = useState<TransactionsResponse | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const refreshKey = useRefreshKey();

  const query = useMemo(() => ({
    q: debouncedSearch.trim() || undefined,
    type,
    category,
    account,
    month,
    sort,
    limit: 20,
    page,
  }), [debouncedSearch, type, category, account, month, sort, page]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .transactions(query)
      .then((response) => {
        if (!active) return;
        setData(response);
        if (response.pages < page) setPage(response.pages);
      })
      .catch((err) => {
        if (!active) return;
        toast.error('Could not load transactions', err instanceof ApiError ? err.message : undefined);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, refreshKey]);

  useEffect(() => {
    let active = true;
    api
      .accounts()
      .then((response) => {
        if (active) setAccounts(response.accounts.filter((item) => !item.isArchived));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const filtersActive = search || type !== 'all' || category !== 'all' || account !== 'all' || month !== currentMonthKey() || sort !== 'date_desc';

  const resetFilters = () => {
    setSearch('');
    setType('all');
    setCategory('all');
    setAccount('all');
    setMonth(currentMonthKey());
    setSort('date_desc');
    setPage(1);
  };

  const updateFilter = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadTransactionsCsv({
        q: debouncedSearch.trim() || undefined,
        type,
        category,
        account,
        month,
        sort,
      });
      toast.success('Export ready', 'Your CSV is downloading.');
    } catch (err) {
      toast.error('Export failed', err instanceof Error ? err.message : undefined);
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await api.deleteTransaction(deleting.id);
      toast.success('Transaction deleted', deleting.merchant || 'The transaction was removed.');
      setDeleting(null);
      window.dispatchEvent(new Event('spendwise:data-changed'));
    } catch (err) {
      toast.error('Could not delete', err instanceof ApiError ? err.message : undefined);
      throw err;
    }
  };

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of data?.items || []) {
      if (!map.has(tx.date)) map.set(tx.date, []);
      map.get(tx.date)!.push(tx);
    }
    return [...map.entries()];
  }, [data]);

  const summary = data?.summary;

  return (
    <>
      <PageHeader
        eyebrow="Ledger"
        title="Transactions"
        subtitle="Every movement across your accounts, in one calm place."
        actions={(
          <>
            <Button variant="secondary" iconLeft={<Download size={16} />} onClick={handleExport} loading={exporting}>
              Export CSV
            </Button>
            <Button variant="primary" iconLeft={<Plus size={16} />} onClick={() => setAddOpen(true)}>
              Add transaction
            </Button>
          </>
        )}
      />

      <Card className="filter-card">
        <div className="filter-top">
          <div className="filter-search">
            <Input
              icon={Search}
              placeholder="Search merchant, note or tag…"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              aria-label="Search transactions"
            />
          </div>
          <div className="filter-tabs" role="group" aria-label="Transaction type">
            {TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`filter-tab ${type === option.value ? 'is-active' : ''}`}
                onClick={() => updateFilter((value) => setType(value as 'all' | TransactionType))(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-bottom">
          <div className="filter-selects">
            <Select value={month} onChange={(event) => updateFilter(setMonth)(event.target.value)} aria-label="Filter by month">
              {monthOptions(12).map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
            <Select value={category} onChange={(event) => updateFilter(setCategory)(event.target.value)} aria-label="Filter by category">
              <option value="all">All categories</option>
              <optgroup label="Expenses">
                {EXPENSE_CATEGORIES.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </optgroup>
              <optgroup label="Income">
                {INCOME_CATEGORIES.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </optgroup>
            </Select>
            <Select value={account} onChange={(event) => updateFilter(setAccount)(event.target.value)} aria-label="Filter by account">
              <option value="all">All accounts</option>
              {accounts.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </Select>
            <Select value={sort} onChange={(event) => updateFilter(setSort)(event.target.value)} aria-label="Sort transactions">
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </div>
          {filtersActive && (
            <Button variant="ghost" size="sm" iconLeft={<X size={14} />} onClick={resetFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </Card>

      <div className="summary-strip">
        <div className="summary-cell">
          <span>Money in</span>
          <strong className="value-positive">+{formatMoney(summary?.income || 0, currency, { decimals: 0 })}</strong>
        </div>
        <div className="summary-cell">
          <span>Money out</span>
          <strong>{formatMoney(summary?.expense || 0, currency, { decimals: 0 })}</strong>
        </div>
        <div className="summary-cell">
          <span>Net</span>
          <strong className={(summary?.net || 0) >= 0 ? 'value-positive' : 'value-negative'}>
            {formatMoney(summary?.net || 0, currency, { decimals: 0, sign: true })}
          </strong>
        </div>
        <div className="summary-cell">
          <span>Transactions</span>
          <strong>{(summary?.count || 0).toLocaleString()}</strong>
        </div>
        <div className="summary-cell summary-cell-muted">
          <span>Savings rate</span>
          <strong>{summary && summary.income > 0 ? formatPercent(Math.max(0, ((summary.income - summary.expense) / summary.income) * 100), 0) : '—'}</strong>
        </div>
      </div>

      <Card className="tx-page-card">
        {loading && !data ? (
          <SkeletonRows rows={8} />
        ) : groups.length ? (
          <div className={loading ? 'is-loading-soft' : ''}>
            {groups.map(([date, items]) => {
              const dayNet = items.reduce((sum, tx) => {
                if (tx.type === 'income') return sum + tx.amount;
                if (tx.type === 'expense') return sum - tx.amount;
                return sum;
              }, 0);
              return (
                <div className="tx-group" key={date}>
                  <div className="tx-group-head">
                    <span>{formatDayHeading(date)}</span>
                    <span className="tx-group-sub">
                      {items.length} transaction{items.length === 1 ? '' : 's'}
                      {dayNet !== 0 && <span className={dayNet > 0 ? 'value-positive' : 'value-negative'}>{formatMoney(dayNet, currency, { decimals: 0, sign: true })}</span>}
                    </span>
                  </div>
                  {items.map((tx) => (
                    <TransactionRow
                      key={tx.id}
                      tx={tx}
                      currency={currency}
                      onEdit={setEditing}
                      onDelete={setDeleting}
                      showTags
                    />
                  ))}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={ReceiptText}
            title={filtersActive ? 'No transactions match those filters' : 'Your ledger is empty'}
            message={filtersActive
              ? 'Try widening the date range or clearing a filter.'
              : 'Add your first transaction and SpendWise will start building the picture.'}
            action={filtersActive
              ? <Button variant="secondary" onClick={resetFilters}>Clear filters</Button>
              : <Button variant="primary" iconLeft={<Plus size={15} />} onClick={() => setAddOpen(true)}>Add transaction</Button>}
          />
        )}

        {data && data.total > 0 && (
          <div className="pagination">
            <span className="pagination-copy">
              Showing {(data.page - 1) * 20 + 1}–{Math.min(data.page * 20, data.total)} of {data.total.toLocaleString()}
            </span>
            <div className="pagination-controls">
              <IconButton label="First page" onClick={() => setPage(1)} disabled={page === 1}>
                <ChevronsLeft size={16} />
              </IconButton>
              <IconButton label="Previous page" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1}>
                <ChevronLeft size={16} />
              </IconButton>
              <span className="pagination-page">{page} / {data.pages}</span>
              <IconButton label="Next page" onClick={() => setPage((value) => Math.min(data.pages, value + 1))} disabled={page >= data.pages}>
                <ChevronRight size={16} />
              </IconButton>
              <IconButton label="Last page" onClick={() => setPage(data.pages)} disabled={page >= data.pages}>
                <ChevronsRight size={16} />
              </IconButton>
            </div>
          </div>
        )}
      </Card>

      <TransactionModal
        open={addOpen || Boolean(editing)}
        transaction={editing}
        defaultAccountId={accounts[0]?.id}
        onClose={() => { setAddOpen(false); setEditing(null); }}
        onSaved={() => { setAddOpen(false); setEditing(null); }}
      />

      <ConfirmModal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete transaction?"
        message={(
          <>
            <p>
              <strong>{deleting?.merchant || 'This transaction'}</strong> for{' '}
              {deleting ? formatMoney(deleting.amount, currency, { decimals: 2 }) : ''} on{' '}
              {deleting?.date} will be permanently removed. Account balances will update automatically.
            </p>
          </>
        )}
        confirmLabel="Delete transaction"
      />
    </>
  );
}
