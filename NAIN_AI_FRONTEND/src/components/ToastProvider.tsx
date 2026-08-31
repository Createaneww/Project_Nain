import React, { createContext, useContext, useState, useCallback } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", title?: string) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type, title }]);

      setTimeout(() => {
        removeToast(id);
      }, 4500);
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, title?: string) => showToast(message, "success", title),
    [showToast]
  );
  const error = useCallback(
    (message: string, title?: string) => showToast(message, "error", title),
    [showToast]
  );
  const info = useCallback(
    (message: string, title?: string) => showToast(message, "info", title),
    [showToast]
  );
  const warning = useCallback(
    (message: string, title?: string) => showToast(message, "warning", title),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      {/* Fixed Toast Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => {
          let bgClass = "bg-white border-slate-200 text-slate-800";
          let icon = "ℹ️";
          let accent = "text-blue-600";

          if (toast.type === "success") {
            bgClass = "bg-emerald-50 border-emerald-200 text-emerald-900";
            icon = "✅";
            accent = "text-emerald-700";
          } else if (toast.type === "error") {
            bgClass = "bg-rose-50 border-rose-200 text-rose-900";
            icon = "❌";
            accent = "text-rose-700";
          } else if (toast.type === "warning") {
            bgClass = "bg-amber-50 border-amber-200 text-amber-900";
            icon = "⚠️";
            accent = "text-amber-700";
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-lg backdrop-blur-sm transition-all animate-slideUp ${bgClass}`}
              role="alert"
            >
              <span className="text-lg shrink-0 mt-0.5">{icon}</span>
              <div className="flex-1 text-xs">
                {toast.title && (
                  <p className={`font-bold ${accent} text-sm mb-0.5`}>
                    {toast.title}
                  </p>
                )}
                <p className="font-medium leading-relaxed">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-slate-400 hover:text-slate-600 text-xs font-bold pl-1"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
