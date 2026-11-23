"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

type Action = { label: string; onClick: () => void };
type Toast = {
  id: number;
  kind: "ok" | "error" | "info";
  text: string;
  action?: Action;
};
type Api = {
  success: (t: string, action?: Action) => void;
  error: (t: string) => void;
  info: (t: string, action?: Action) => void;
};

const ToastContext = createContext<Api | null>(null);

/** Ekranın altında kısa süre görünen bildirimler ("Kaydedildi" gibi). */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const nextId = useRef(1);

  const push = useCallback(
    (kind: Toast["kind"], text: string, action?: Action) => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-3), { id, kind, text, action }]);
      setTimeout(
        () => setToasts((t) => t.filter((x) => x.id !== id)),
        kind === "error" ? 7000 : action ? 6000 : 3500,
      );
    },
    [],
  );

  const api = useMemo<Api>(
    () => ({
      success: (t, a) => push("ok", t, a),
      error: (t) => push("error", t),
      info: (t, a) => push("info", t, a),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast ${t.kind}`}
            role={t.kind === "error" ? "alert" : "status"}
          >
            <span aria-hidden>
              {t.kind === "ok" ? "✓" : t.kind === "error" ? "!" : "i"}
            </span>
            {t.text}
            {t.action && (
              <button
                className="toast-action"
                onClick={() => {
                  t.action?.onClick();
                  setToasts((x) => x.filter((y) => y.id !== t.id));
                }}
              >
                {t.action.label}
              </button>
            )}
            <button
              onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
              aria-label="Kapat"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Api {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast, ToastProvider içinde kullanılmalı");
  return ctx;
}
