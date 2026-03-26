import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheckCircle, FiXCircle, FiAlertTriangle, FiInfo, FiX } from 'react-icons/fi';

/* ─── Context ───────────────────────────────────────────────────────── */
const ToastContext = createContext(null);

let _addToast = null;
export const toast = {
  success: (msg, opts) => _addToast?.({ type: 'success', message: msg, ...opts }),
  error:   (msg, opts) => _addToast?.({ type: 'error',   message: msg, ...opts }),
  warning: (msg, opts) => _addToast?.({ type: 'warning', message: msg, ...opts }),
  info:    (msg, opts) => _addToast?.({ type: 'info',    message: msg, ...opts }),
  loading: (msg, opts) => _addToast?.({ type: 'loading', message: msg, duration: 0, ...opts }),
};

/* ─── Config ─────────────────────────────────────────────────────────── */
const CONFIG = {
  success: {
    icon: FiCheckCircle,
    gradient: 'from-emerald-500 to-green-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
    iconColor: 'text-emerald-500',
    bar: 'bg-gradient-to-r from-emerald-400 to-green-500',
  },
  error: {
    icon: FiXCircle,
    gradient: 'from-red-500 to-rose-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    iconColor: 'text-red-500',
    bar: 'bg-gradient-to-r from-red-400 to-rose-500',
  },
  warning: {
    icon: FiAlertTriangle,
    gradient: 'from-amber-400 to-orange-500',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    iconColor: 'text-amber-500',
    bar: 'bg-gradient-to-r from-amber-400 to-orange-500',
  },
  info: {
    icon: FiInfo,
    gradient: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    iconColor: 'text-blue-500',
    bar: 'bg-gradient-to-r from-blue-400 to-indigo-500',
  },
  loading: {
    icon: null,
    gradient: 'from-slate-400 to-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-700',
    iconColor: 'text-slate-500',
    bar: 'bg-gradient-to-r from-slate-300 to-slate-500',
  },
};

/* ─── Single Toast Item ──────────────────────────────────────────────── */
const ToastItem = ({ toast: t, onRemove }) => {
  const cfg = CONFIG[t.type] || CONFIG.info;
  const Icon = cfg.icon;
  const duration = t.duration ?? 4000;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.92 }}
      animate={{ opacity: 1, x: 0,  scale: 1   }}
      exit={{    opacity: 0, x: 80, scale: 0.88, transition: { duration: 0.25 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className={`
        relative flex items-start gap-3 w-80 rounded-xl border shadow-xl shadow-black/10
        overflow-hidden backdrop-blur-sm cursor-pointer select-none
        ${cfg.bg} ${cfg.border}
      `}
      onClick={() => onRemove(t.id)}
      whileHover={{ scale: 1.02, x: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Left accent strip */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.bar}`} />

      {/* Icon */}
      <div className="flex-shrink-0 pt-3.5 pl-4">
        {t.type === 'loading' ? (
          <div className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
        ) : (
          <Icon className={`text-xl ${cfg.iconColor}`} />
        )}
      </div>

      {/* Message */}
      <div className="flex-1 py-3 pr-2 min-w-0">
        <p className={`text-sm font-semibold leading-snug ${cfg.text}`}>
          {t.message}
        </p>
      </div>

      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(t.id); }}
        className="flex-shrink-0 mt-2.5 mr-2.5 p-1 rounded-lg hover:bg-black/10 transition-colors"
      >
        <FiX className="text-sm text-slate-400" />
      </button>

      {/* Progress bar */}
      {duration > 0 && (
        <motion.div
          className={`absolute bottom-0 left-0 h-0.5 ${cfg.bar}`}
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
        />
      )}
    </motion.div>
  );
};

/* ─── Provider ───────────────────────────────────────────────────────── */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((options) => {
    const id = options.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const duration = options.duration ?? 4000;
    
    setToasts(prev => {
      const exists = prev.some(t => t.id === id);
      if (exists) {
        return prev.map(t => t.id === id ? { ...t, ...options, id } : t);
      }
      return [...prev, { id, duration, ...options }];
    });

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration + 300);
    }
    return id;
  }, [removeToast]);

  // Wire up the static toast helper
  useEffect(() => {
    _addToast = addToast;
    return () => { _addToast = null; };
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {createPortal(
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 pointer-events-none">
          <AnimatePresence mode="popLayout">
            {toasts.map(t => (
              <div key={t.id} className="pointer-events-auto">
                <ToastItem toast={t} onRemove={removeToast} />
              </div>
            ))}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
export default toast;
