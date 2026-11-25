import { useEffect, useRef, useState } from "react";
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Set());
  useEffect(() => {
    const activeTimers = timers.current;
    const listen = (event) => {
      if (!event.detail?.message) return;
      const id = crypto.randomUUID();
      setToasts((items) => [
        ...items.slice(-3),
        {
          id,
          message: event.detail.message,
          kind: event.detail.kind || "success",
        },
      ]);
      const timer = window.setTimeout(() => {
        setToasts((items) => items.filter((item) => item.id !== id));
        activeTimers.delete(timer);
      }, 5000);
      activeTimers.add(timer);
    };
    window.addEventListener("assurrec:toast", listen);
    return () => {
      window.removeEventListener("assurrec:toast", listen);
      activeTimers.forEach(window.clearTimeout);
      activeTimers.clear();
    };
  }, []);
  return (
    <>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.kind}`}
            role={toast.kind === "error" ? "alert" : "status"}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </>
  );
}
