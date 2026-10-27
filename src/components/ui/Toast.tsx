"use client";

import React, {
  createContext, useContext, useState, useCallback,
  useEffect, useRef,
} from "react";
import { createPortal } from "react-dom";

// ─── Types ────────────────────────────────────────────────────────────────────
export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, default 4000; 0 = persistent
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, "id">) => string;
  success: (title: string, message?: string, duration?: number) => string;
  error:   (title: string, message?: string, duration?: number) => string;
  warning: (title: string, message?: string, duration?: number) => string;
  info:    (title: string, message?: string, duration?: number) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Config ───────────────────────────────────────────────────────────────────
const CFG: Record<ToastType, { icon: string; color: string; bg: string; border: string; progressColor: string }> = {
  success: {
    icon:          "bi-check-circle-fill",
    color:         "#10b981",
    bg:            "rgba(16,185,129,0.08)",
    border:        "rgba(16,185,129,0.25)",
    progressColor: "#10b981",
  },
  error: {
    icon:          "bi-x-circle-fill",
    color:         "#ef4444",
    bg:            "rgba(239,68,68,0.08)",
    border:        "rgba(239,68,68,0.25)",
    progressColor: "#ef4444",
  },
  warning: {
    icon:          "bi-exclamation-triangle-fill",
    color:         "#f59e0b",
    bg:            "rgba(245,158,11,0.08)",
    border:        "rgba(245,158,11,0.25)",
    progressColor: "#f59e0b",
  },
  info: {
    icon:          "bi-info-circle-fill",
    color:         "#3b82f6",
    bg:            "rgba(59,130,246,0.08)",
    border:        "rgba(59,130,246,0.25)",
    progressColor: "#3b82f6",
  },
};

// ─── Single Toast Item ────────────────────────────────────────────────────────
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const cfg = CFG[toast.type];
  const duration = toast.duration ?? 2500;
  const [visible,  setVisible]  = useState(false);
  const [progress, setProgress] = useState(100);
  const startRef   = useRef<number>(0);
  const rafRef     = useRef<number>(0);
  const pausedRef  = useRef(false);
  const remainRef  = useRef(duration);

  // Slide in
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Progress bar countdown
  useEffect(() => {
    if (duration === 0) return;

    const tick = (ts: number) => {
      if (pausedRef.current) { startRef.current = ts; rafRef.current = requestAnimationFrame(tick); return; }
      const elapsed = ts - startRef.current;
      startRef.current = ts;
      remainRef.current = Math.max(0, remainRef.current - elapsed);
      const pct = (remainRef.current / duration) * 100;
      setProgress(pct);
      if (remainRef.current <= 0) { handleDismiss(); return; }
      rafRef.current = requestAnimationFrame(tick);
    };

    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => onDismiss(toast.id), 280);
  }, [onDismiss, toast.id]);

  return (
    <div
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
      style={{
        position: "relative", overflow: "hidden",
        background: "var(--card, #ffffff)",
        border: `1px solid ${cfg.border}`,
        borderLeft: `3.5px solid ${cfg.color}`,
        borderRadius: 12,
        boxShadow: "0 4px 24px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.06)",
        padding: "12px 14px",
        display: "flex", alignItems: "flex-start", gap: 10,
        minWidth: 280, maxWidth: 360,
        transform: visible ? "translateX(0) scale(1)" : "translateX(100%) scale(0.95)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.28s ease",
        marginBottom: 8,
        cursor: "default",
      }}
    >
      {/* Icon */}
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: cfg.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginTop: toast.message ? 1 : 0,
      }}>
        <i className={`bi ${cfg.icon}`} style={{ color: cfg.color, fontSize: 15 }} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13.5, fontWeight: 500, color: "var(--foreground, #1e293b)",
          lineHeight: 1.4, marginBottom: toast.message ? 2 : 0,
        }}>
          {toast.title}
        </div>
        {toast.message && (
          <div style={{ fontSize: 12.5, color: "var(--muted-foreground, #64748b)", lineHeight: 1.5 }}>
            {toast.message}
          </div>
        )}
      </div>

      {/* Close */}
      <button
        onClick={handleDismiss}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--muted-foreground, #64748b)", padding: 2, flexShrink: 0,
          borderRadius: 6, lineHeight: 1, fontSize: 15,
          transition: "color 0.15s, background 0.15s",
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 22, height: 22,
        }}
        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "var(--muted, #f1f5f9)"}
        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "none"}
      >
        <i className="bi bi-x" />
      </button>

      {/* Progress bar */}
      {duration > 0 && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
          background: "var(--muted, #f1f5f9)",
        }}>
          <div style={{
            height: "100%", background: cfg.progressColor,
            width: `${progress}%`,
            transition: "width 0.1s linear",
            borderRadius: "0 0 0 12px",
          }} />
        </div>
      )}
    </div>
  );
}

// ─── Container (renders via portal) ──────────────────────────────────────────
function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted || toasts.length === 0) return null;

  return createPortal(
    <div style={{
      position: "fixed", top: 76, right: 24, zIndex: 99999,
      display: "flex", flexDirection: "column",
      alignItems: "flex-end",
      pointerEvents: "none",
    }}>
      {[...toasts].map(t => (
        <div key={t.id} style={{ pointerEvents: "auto" }}>
          <ToastItem toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>,
    document.body
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((opts: Omit<Toast, "id">): string => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { ...opts, id }]);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => setToasts([]), []);

  const value: ToastContextValue = {
    toast:   add,
    success: (title, message, duration) => add({ type: "success", title, message, duration }),
    error:   (title, message, duration) => add({ type: "error",   title, message, duration }),
    warning: (title, message, duration) => add({ type: "warning", title, message, duration }),
    info:    (title, message, duration) => add({ type: "info",    title, message, duration }),
    dismiss,
    dismissAll,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback safe dummy if used outside provider
    return {
      toast: () => "",
      success: (t, m) => { console.log(t, m); return ""; },
      error: (t, m) => { console.error(t, m); return ""; },
      warning: (t, m) => { console.warn(t, m); return ""; },
      info: (t, m) => { console.info(t, m); return ""; },
      dismiss: () => {},
      dismissAll: () => {},
    };
  }
  return ctx;
}

export default ToastProvider;
