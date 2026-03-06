import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { getSupabase } from '../../shared/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

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
        // Extract tokens from the callback URL
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
      <View style={styles.container}>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>We sent a magic link to sign you in.</Text>
        <TouchableOpacity onPress={() => setSent(false)}>
          <Text style={styles.link}>Try a different email</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>zenmode</Text>
      <Text style={styles.subtitle}>
        A calm, intentional space to plan your day, focus on what matters, and let go of the rest.
      </Text>

      <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
        <Text style={styles.googleButtonText}>Continue with Google</Text>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <TextInput
        style={styles.input}
        placeholder="you@example.com"
        placeholderTextColor="#a8a29e"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleMagicLink}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send magic link'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 32, backgroundColor: '#fafaf9' },
  brand: { fontSize: 36, fontWeight: '600', color: '#1c1917', textAlign: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '600', color: '#1c1917', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#78716c', textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  googleButton: {
    borderWidth: 1, borderColor: '#d6d3d1', borderRadius: 10, paddingVertical: 12,
    alignItems: 'center', backgroundColor: '#fff', marginBottom: 20,
  },
  googleButtonText: { fontSize: 15, fontWeight: '500', color: '#1c1917' },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e7e5e4' },
  dividerText: { marginHorizontal: 12, fontSize: 12, color: '#a8a29e' },
  input: {
    borderWidth: 1, borderColor: '#d6d3d1', borderRadius: 10, paddingHorizontal: 16,
    paddingVertical: 12, fontSize: 15, color: '#1c1917', backgroundColor: '#fff', marginBottom: 12,
  },
  button: {
    backgroundColor: '#1c1917', borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 15, fontWeight: '500', color: '#fff' },
  link: { fontSize: 14, color: '#78716c', textAlign: 'center', marginTop: 16 },
});
