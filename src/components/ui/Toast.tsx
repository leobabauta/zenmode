import { useRef, useState, createContext, useContext, useCallback } from 'react';

interface ToastMessage {
  id: number;
  text: string;
  onUndo?: () => void;
}

interface ToastContextValue {
  show: (text: string, onUndo?: () => void) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const dismiss = useCallback(() => {
    setToast(null);
  }, []);

  const show = useCallback((text: string, onUndo?: () => void) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ id: ++nextId, text, onUndo });
    timerRef.current = setTimeout(dismiss, 4000);
  }, [dismiss]);

  const handleUndo = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    toast?.onUndo?.();
    dismiss();
  };

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <div
          key={toast.id}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-[#1c1917] text-white rounded-xl px-5 py-3 shadow-lg flex items-center gap-4 text-sm font-medium animate-[slideUp_0.2s_ease-out]"
        >
          <span>{toast.text}</span>
          {toast.onUndo && (
            <button
              onClick={handleUndo}
              className="px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-colors"
            >
              Undo
            </button>
          )}
        </div>
      )}
    </ToastContext.Provider>
  );
}
