import { useState, useEffect, useCallback } from "react";

interface ToastMessage {
  id: number;
  text: string;
  type: "error" | "success";
}

let addToastFn: ((text: string, type: "error" | "success") => void) | null = null;

export function showToast(text: string, type: "error" | "success" = "error") {
  addToastFn?.(text, type);
}

let nextId = 0;

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string, type: "error" | "success") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => {
      addToastFn = null;
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-lg shadow-lg text-sm text-white ${
            toast.type === "error" ? "bg-red-600" : "bg-green-600"
          }`}
        >
          {toast.text}
          <button
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="ml-3 text-white/70 hover:text-white"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
