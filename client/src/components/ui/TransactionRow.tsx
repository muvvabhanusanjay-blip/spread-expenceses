import { ArrowLeftRight, Pencil, Trash2 } from 'lucide-react';
import type { Transaction } from '../../lib/types';
import { categoryMeta } from '../../lib/categories';
import { formatMoney, formatDate } from '../../lib/format';
import { CategoryIcon } from './CategoryIcon';
import { IconButton } from './Button';

interface TransactionRowProps {
  tx: Transaction;
  currency: string;
  onEdit?: (tx: Transaction) => void;
  onDelete?: (tx: Transaction) => void;
  showTags?: boolean;
}

export function TransactionRow({ tx, currency, onEdit, onDelete, showTags = false }: TransactionRowProps) {
  const meta = categoryMeta(tx.category);
  const isTransfer = tx.type === 'transfer';
  const title = tx.merchant || (isTransfer ? 'Transfer' : meta.label);
  const metaParts = isTransfer
    ? ['Transfer', tx.account?.name, tx.toAccount?.name].filter(Boolean)
    : [meta.label, tx.account?.name].filter(Boolean);

  return (
    <div className="tx-row">
      <CategoryIcon category={isTransfer ? 'transfer' : tx.category} color={isTransfer ? '#8FA3BF' : meta.color} />
      <div className="tx-copy">
        <div className="tx-title-line">
          <span className="tx-title" title={tx.note || title}>{title}</span>
          {isTransfer && <ArrowLeftRight size={12} className="tx-transfer-mark" />}
          {showTags && tx.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="tag-pill">{tag}</span>
          ))}
        </div>
        <div className="tx-meta">
          {metaParts.map((part, index) => (
            <span key={`${part}-${index}`}>
              {index > 0 && <span className="dot-sep">·</span>}
              {part}
            </span>
          ))}
          {showTags && <span className="tx-date-inline"><span className="dot-sep">·</span>{formatDate(tx.date, 'MMM d')}</span>}
        </div>
      </div>
      <div className="tx-right">
        <span className={`tx-amount ${tx.type}`}>
          {tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : ''}
          {formatMoney(tx.amount, currency, { decimals: 2 })}
        </span>
        {(onEdit || onDelete) && (
          <div className="tx-actions">
            {onEdit && (
              <IconButton label="Edit transaction" onClick={() => onEdit(tx)}>
                <Pencil size={15} />
              </IconButton>
            )}
            {onDelete && (
              <IconButton label="Delete transaction" tone="danger" onClick={() => onDelete(tx)}>
                <Trash2 size={15} />
              </IconButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
