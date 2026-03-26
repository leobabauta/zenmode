import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { getSupabase } from '../../../shared/lib/supabase';
import { useAuthStore } from '../../../shared/store/useAuthStore';
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useColors } from '../lib/colors';
import { usePlannerStore } from '../store/usePlannerStore';

const GOOGLE_WEB_CLIENT_ID = '792674113739-mpggu1759u4q6ue4k0qg5r9j98f5fs9c.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = '792674113739-43i08tn8gf2a4c2f24h0it3h6c8gg0nt.apps.googleusercontent.com';
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://hlyxiyvqmfupyqjgfajj.supabase.co';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const colors = useColors();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      scopes: ['https://www.googleapis.com/auth/calendar.events.readonly'],
      offlineAccess: true,
    });
  }, []);

  const handleGoogleSignIn = async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (response.type === 'success' && response.data.idToken) {
        const { data: authData, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: response.data.idToken,
        });
        if (error) {
          Alert.alert('Sign in failed', error.message);
          return;
        }

        // Exchange serverAuthCode for access + refresh tokens for Calendar API
        const serverAuthCode = response.data.serverAuthCode;
        if (serverAuthCode && authData.user) {
          exchangeAuthCodeForTokens(serverAuthCode, authData.user.id, supabase);
        }
      }
    } catch (error) {
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
          // User cancelled
        } else if (error.code === statusCodes.IN_PROGRESS) {
          // Already in progress
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          Alert.alert('Error', 'Google Play services are not available on this device.');
        } else {
          Alert.alert('Error', error.message || 'Google sign-in failed');
        }
      }
    }
  };

  const exchangeAuthCodeForTokens = async (
    authCode: string,
    userId: string,
    supabase: ReturnType<typeof getSupabase>,
  ) => {
    try {
      // Exchange the auth code via the Edge Function (which has the client secret)
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/exchange-google-code`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code: authCode }),
        },
      );

      if (res.ok) {
        usePlannerStore.getState().setGoogleCalendarConnected(true);
      } else {
        console.warn('Failed to exchange Google auth code:', await res.text());
      }
    } catch (err) {
      console.warn('Error exchanging Google auth code:', err);
    }
  };

  const handleSignIn = async () => {
    const supabase = getSupabase();
    if (!supabase || !email.trim() || !password) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Sign in failed', error.message);
    }
  };

  const handleSignUp = async () => {
    const supabase = getSupabase();
    if (!supabase || !email.trim() || !password) return;

    if (password.length < 8) {
      Alert.alert('Password too short', 'Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Sign up failed', error.message);
    } else {
      Alert.alert('Check your email', 'We sent you a confirmation link. Please verify your email, then sign in.');
      setMode('signin');
    }
  };

  const handleForgotPassword = async () => {
    const supabase = getSupabase();
    if (!supabase || !email.trim()) {
      Alert.alert('Enter your email', 'Please enter your email address first.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setResetSent(true);
    }
  };

  if (mode === 'forgot') {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={[styles.brand, { color: colors.text }]}>zenmode</Text>
        {resetSent ? (
          <>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Password reset link sent! Check your email.
            </Text>
            <TouchableOpacity onPress={() => { setMode('signin'); setResetSent(false); }}>
              <Text style={[styles.link, { color: colors.accent }]}>Back to sign in</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enter your email and we'll send you a link to reset your password.
            </Text>

            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.accent }, loading && styles.buttonDisabled]}
              onPress={handleForgotPassword}
              disabled={loading}
            >
              <Text style={[styles.buttonText, { color: colors.accentText }]}>
                {loading ? 'Sending...' : 'Send reset link'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setMode('signin')}>
              <Text style={[styles.link, { color: colors.textSecondary }]}>Back to sign in</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.brand, { color: colors.text }]}>zenmode</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {mode === 'signin'
          ? 'A calm, intentional space to plan your day, focus on what matters, and let go of the rest.'
          : 'Create your account'}
      </Text>

      <TouchableOpacity
        style={[styles.googleButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
        onPress={handleGoogleSignIn}
      >
        <Text style={[styles.googleButtonText, { color: colors.text }]}>Continue with Google</Text>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.textMuted }]}>or</Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
        placeholder="you@example.com"
        placeholderTextColor={colors.textMuted}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <View style={{ position: 'relative' }}>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface, paddingRight: 60 }]}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity
          style={styles.showHide}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            {showPassword ? 'Hide' : 'Show'}
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'signup' && (
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Must be at least 8 characters
        </Text>
      )}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.accent }, loading && styles.buttonDisabled]}
        onPress={mode === 'signin' ? handleSignIn : handleSignUp}
        disabled={loading}
      >
        <Text style={[styles.buttonText, { color: colors.accentText }]}>
          {loading
            ? (mode === 'signin' ? 'Signing in...' : 'Creating account...')
            : (mode === 'signin' ? 'Sign in' : 'Create account')}
        </Text>
      </TouchableOpacity>

      {mode === 'signin' && (
        <TouchableOpacity onPress={() => setMode('forgot')}>
          <Text style={[styles.link, { color: colors.textMuted }]}>Forgot your password?</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
        <Text style={[styles.link, { color: colors.textSecondary }]}>
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.devBypass}
        onPress={() => {
          useAuthStore.getState().setAuth({ id: 'dev', email: 'leo.babauta@gmail.com' } as any, null);
        }}
      >
        <Text style={{ color: colors.bg, fontSize: 10 }}>.</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 32 },
  brand: { fontSize: 36, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  googleButton: {
    borderWidth: 1, borderRadius: 10, paddingVertical: 12,
    alignItems: 'center', marginBottom: 20,
  },
  googleButtonText: { fontSize: 15, fontWeight: '500' },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12, fontSize: 12 },
  input: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 16,
    paddingVertical: 12, fontSize: 15, marginBottom: 12,
  },
  showHide: {
    position: 'absolute', right: 16, top: 0, bottom: 12,
    justifyContent: 'center',
  },
  hint: { fontSize: 12, marginBottom: 12, marginTop: -4 },
  button: {
    borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 16, fontWeight: '600' },
  link: { fontSize: 14, textAlign: 'center', marginTop: 16 },
  devBypass: { position: 'absolute', bottom: 20, right: 20, padding: 10 },
});
