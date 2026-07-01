/**
 * Global toast notification + confirm dialog system.
 *
 * Usage:
 *   import { toast, confirm } from './Toast';
 *
 *   toast.success('Saved!');
 *   toast.error('Something went wrong.');
 *   toast.warning('Check your input.');
 *   toast.info('Loading...');
 *
 *   const yes = await confirm('Are you sure?', 'This cannot be undone.');
 *   if (yes) { ... }
 *
 * Mount <ToastContainer /> once in App.jsx.
 */

import { useState, useEffect, useCallback } from 'react';
import '../styles/Toast.css';

// ── Internal event bus ────────────────────────────────────────────────────────
let _addToast = null;
let _setConfirm = null;

export const toast = {
  success: (msg, title)  => _addToast?.({ type: 'success', title: title || 'Success',  message: msg }),
  error:   (msg, title)  => _addToast?.({ type: 'error',   title: title || 'Error',    message: msg }),
  warning: (msg, title)  => _addToast?.({ type: 'warning', title: title || 'Warning',  message: msg }),
  info:    (msg, title)  => _addToast?.({ type: 'info',    title: title || 'Info',     message: msg }),
};

/** Returns a Promise<boolean> — resolves true if confirmed, false if cancelled. */
export function confirm(message, detail = '') {
  return new Promise((resolve) => {
    _setConfirm?.({ message, detail, resolve });
  });
}

// ── ToastItem ─────────────────────────────────────────────────────────────────
const ICONS = {
  success: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <path d="M8 12.5l3 3 5-5.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round"/>
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
};

function ToastItem({ id, type, title, message, onRemove }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onRemove(id), 300);
    }, 4000);
    return () => clearTimeout(t);
  }, [id, onRemove]);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => onRemove(id), 300);
  };

  return (
    <div className={`toast-item toast-item--${type}${exiting ? ' toast-item--exit' : ''}`} role="alert">
      <div className="toast-icon">{ICONS[type]}</div>
      <div className="toast-body">
        {title && <div className="toast-title">{title}</div>}
        <div className="toast-message">{message}</div>
      </div>
      <button type="button" className="toast-close" onClick={handleClose} aria-label="Dismiss">✕</button>
    </div>
  );
}

// ── ConfirmDialog ─────────────────────────────────────────────────────────────
function ConfirmDialog({ message, detail, resolve, onClose }) {
  const handleConfirm = () => { onClose(); resolve(true); };
  const handleCancel  = () => { onClose(); resolve(false); };

  return (
    <div className="confirm-overlay" onClick={handleCancel}>
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <div className="confirm-icon">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div className="confirm-body">
          <p className="confirm-message">{message}</p>
          {detail && <p className="confirm-detail">{detail}</p>}
        </div>
        <div className="confirm-actions">
          <button type="button" className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
          <button type="button" className="btn btn-danger"    onClick={handleConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ── ToastContainer (mount once in App) ───────────────────────────────────────
export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  const addToast = useCallback((t) => {
    setToasts(prev => [...prev, { ...t, id: Date.now() + Math.random() }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Register handlers
  useEffect(() => {
    _addToast  = addToast;
    _setConfirm = setConfirmState;
    return () => { _addToast = null; _setConfirm = null; };
  }, [addToast]);

  return (
    <>
      <div className="toast-container" aria-live="polite">
        {toasts.map(t => (
          <ToastItem key={t.id} {...t} onRemove={removeToast} />
        ))}
      </div>

      {confirmState && (
        <ConfirmDialog
          {...confirmState}
          onClose={() => setConfirmState(null)}
        />
      )}
    </>
  );
}
