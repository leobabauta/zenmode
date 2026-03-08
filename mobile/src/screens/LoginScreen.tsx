import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { getSupabase } from '../../../shared/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { useColors } from '../lib/colors';

WebBrowser.maybeCompleteAuthSession();

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const colors = useColors();

  const handleMagicLink = async () => {
    const supabase = getSupabase();
    if (!supabase || !email.trim()) return;

    setLoading(true);
    const redirectTo = makeRedirectUri();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setSent(true);
    }
  };

  const handleGoogleSignIn = async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    const redirectTo = makeRedirectUri();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    if (data.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const params = new URLSearchParams(url.hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        }
      }
    }
  };

  if (sent) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={[styles.title, { color: colors.text }]}>Check your email</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>We sent a magic link to sign you in.</Text>
        <TouchableOpacity onPress={() => setSent(false)}>
          <Text style={[styles.link, { color: colors.textSecondary }]}>Try a different email</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.brand, { color: colors.text }]}>zenmode</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        A calm, intentional space to plan your day, focus on what matters, and let go of the rest.
      </Text>

      <TouchableOpacity style={[styles.googleButton, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={handleGoogleSignIn}>
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

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.accent }, loading && styles.buttonDisabled]}
        onPress={handleMagicLink}
        disabled={loading}
      >
        <Text style={[styles.buttonText, { color: colors.accentText }]}>{loading ? 'Sending...' : 'Send magic link'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 32 },
  brand: { fontSize: 36, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
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
  button: {
    borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 15, fontWeight: '500' },
  link: { fontSize: 14, textAlign: 'center', marginTop: 16 },
});
