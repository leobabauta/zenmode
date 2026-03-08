import { useEffect, useRef, useState, createContext, useContext, useCallback } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '../lib/colors';

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
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const colors = useColors();

  const dismiss = useCallback(() => {
    Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setToast(null);
    });
  }, [opacity]);

  const show = useCallback((text: string, onUndo?: () => void) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const id = ++nextId;
    setToast({ id, text, onUndo });
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    timerRef.current = setTimeout(dismiss, 3500);
  }, [opacity, dismiss]);

  const handleUndo = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    toast?.onUndo?.();
    dismiss();
  };

  // Toast is always dark-on-light style for contrast regardless of theme
  const toastBg = colors.accent;
  const toastText = colors.accentText;

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <Animated.View style={[styles.container, { opacity, backgroundColor: toastBg }]}>
          <Text style={[styles.text, { color: toastText }]}>{toast.text}</Text>
          {toast.onUndo && (
            <TouchableOpacity onPress={handleUndo} style={styles.undoButton}>
              <Text style={[styles.undoText, { color: toastText }]}>Undo</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  undoButton: {
    marginLeft: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
  },
  undoText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
