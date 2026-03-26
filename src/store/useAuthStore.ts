import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  passwordRecovery: boolean;
  setAuth: (user: User | null, session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setPasswordRecovery: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  passwordRecovery: false,
  setAuth: (user, session) => set({ user, session, loading: false }),
  setLoading: (loading) => set({ loading }),
  setPasswordRecovery: (passwordRecovery) => set({ passwordRecovery }),
}));
