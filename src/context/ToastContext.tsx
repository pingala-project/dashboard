import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Cancel01Icon, CheckmarkCircle02Icon, InformationCircleIcon, Alert02Icon } from 'hugeicons-react';

export type ToastTone = 'success' | 'info' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  showToast: (title: string, message?: string, tone?: ToastTone) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === 'success') return <CheckmarkCircle02Icon size={17} />;
  if (tone === 'warning') return <Alert02Icon size={17} />;
  if (tone === 'error') return <Alert02Icon size={17} />;
  return <InformationCircleIcon size={17} />;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((title: string, message?: string, tone: ToastTone = 'info') => {
    const id = crypto.randomUUID();
    setToasts((current) => [{ id, title, message, tone }, ...current]);
    return id;
  }, []);

  const value = useMemo(() => ({ showToast, dismissToast }), [dismissToast, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-atomic="false">
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            className={`toast-card toast-${toast.tone}`}
            style={{ zIndex: toasts.length - index, ['--toast-index' as string]: index }}
            role="status"
          >
            <div className="toast-icon"><ToastIcon tone={toast.tone} /></div>
            <div className="toast-copy">
              <strong>{toast.title}</strong>
              {toast.message && <span>{toast.message}</span>}
            </div>
            <button className="toast-dismiss" onClick={() => dismissToast(toast.id)} aria-label="Dismiss notification">
              <Cancel01Icon size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
