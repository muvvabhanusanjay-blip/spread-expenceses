import { useState, type ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  busyLabel?: string;
  tone?: 'danger' | 'primary';
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Delete',
  busyLabel = 'Working…',
  tone = 'danger',
}: ConfirmModalProps) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // The caller surfaces the error and keeps the dialog open.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={title}
      size="sm"
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={handleConfirm} loading={busy}>
            {busy ? busyLabel : confirmLabel}
          </Button>
        </>
      )}
    >
      <div className="confirm-body">
        {tone === 'danger' && (
          <span className="confirm-icon">
            <TriangleAlert size={20} />
          </span>
        )}
        <div>{message}</div>
      </div>
    </Modal>
  );
}
