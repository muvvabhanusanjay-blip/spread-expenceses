import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
}

interface ToastContextValue {
  push: (tone: ToastTone, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

const ICONS = {
  success: CircleCheck,
  error: TriangleAlert,
  info: Info,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, title: string, message?: string) => {
      const id = nextId++;
      setToasts((items) => [...items.slice(-3), { id, tone, title, message }]);
      window.setTimeout(() => remove(id), 4200);
    },
    [remove]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (title, message) => push('success', title, message),
      error: (title, message) => push('error', title, message),
      info: (title, message) => push('info', title, message),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone];
          return (
            <div key={toast.id} className={`toast toast-${toast.tone}`}>
              <span className="toast-icon">
                <Icon size={18} />
              </span>
              <div className="toast-copy">
                <strong>{toast.title}</strong>
                {toast.message && <span>{toast.message}</span>}
              </div>
              <button className="toast-close" onClick={() => remove(toast.id)} aria-label="Dismiss notification">
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
