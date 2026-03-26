import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertTriangle, FiTrash2, FiX, FiCheck } from 'react-icons/fi';

const ConfirmContext = createContext(null);

/* ─── Hook ────────────────────────────────────────────────────────────── */
export const useConfirm = () => useContext(ConfirmContext);

/* ─── Provider ────────────────────────────────────────────────────────── */
export const ConfirmProvider = ({ children }) => {
  const [state, setState] = useState(null);

  const confirm = useCallback(({
    title       = 'Are you sure?',
    message     = 'This action cannot be undone.',
    confirmText = 'Confirm',
    cancelText  = 'Cancel',
    variant     = 'danger',  // 'danger' | 'warning' | 'info'
  } = {}) => {
    return new Promise((resolve) => {
      setState({ title, message, confirmText, cancelText, variant, resolve });
    });
  }, []);

  const handleConfirm = () => {
    state?.resolve(true);
    setState(null);
  };

  const handleCancel = () => {
    state?.resolve(false);
    setState(null);
  };

  const variantConfig = {
    danger: {
      icon: FiTrash2,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      btnBg: 'bg-red-600 hover:bg-red-700 shadow-red-200',
      ring: 'ring-red-200',
    },
    warning: {
      icon: FiAlertTriangle,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      btnBg: 'bg-amber-500 hover:bg-amber-600 shadow-amber-200',
      ring: 'ring-amber-200',
    },
    info: {
      icon: FiCheck,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      btnBg: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200',
      ring: 'ring-blue-200',
    },
  };

  const cfg = variantConfig[state?.variant] || variantConfig.danger;
  const ConfirmIcon = cfg.icon;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {createPortal(
        <AnimatePresence>
          {state && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9998]"
                onClick={handleCancel}
              />

              {/* Dialog */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 20 }}
                animate={{ opacity: 1, scale: 1,    y: 0  }}
                exit={{    opacity: 0, scale: 0.88,  y: 12 }}
                transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
              >
                <div
                  className={`
                    bg-white rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto
                    ring-1 ${cfg.ring} overflow-hidden
                  `}
                >
                  {/* Top gradient accent */}
                  <div className="h-1 w-full bg-gradient-to-r from-transparent via-red-400 to-transparent opacity-60" />

                  <div className="p-6">
                    {/* Icon + Title */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`flex-shrink-0 w-11 h-11 rounded-full ${cfg.iconBg} flex items-center justify-center`}>
                        <ConfirmIcon className={`text-xl ${cfg.iconColor}`} />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <h3 className="text-base font-bold text-slate-800 leading-snug">
                          {state.title}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                          {state.message}
                        </p>
                      </div>
                      <button
                        onClick={handleCancel}
                        className="flex-shrink-0 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                      >
                        <FiX className="text-base" />
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2.5 mt-5">
                      <button
                        onClick={handleCancel}
                        className="
                          flex-1 py-2.5 px-4 rounded-xl border border-slate-200
                          text-sm font-semibold text-slate-600
                          hover:bg-slate-50 hover:border-slate-300
                          transition-all active:scale-95
                        "
                      >
                        {state.cancelText}
                      </button>
                      <motion.button
                        onClick={handleConfirm}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className={`
                          flex-1 py-2.5 px-4 rounded-xl text-white
                          text-sm font-bold shadow-lg
                          transition-all active:scale-95
                          ${cfg.btnBg}
                        `}
                      >
                        {state.confirmText}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </ConfirmContext.Provider>
  );
};

export default ConfirmProvider;
