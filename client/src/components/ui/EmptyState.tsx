import type { ReactNode } from 'react';
import type { IconType } from '../../lib/categories';

interface EmptyStateProps {
  icon: IconType;
  title: string;
  message: string;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, message, action, compact = false }: EmptyStateProps) {
  return (
    <div className={`empty ${compact ? 'empty-compact' : ''}`}>
      <span className="empty-icon">
        <Icon size={compact ? 20 : 24} />
      </span>
      <h3>{title}</h3>
      <p>{message}</p>
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}
