import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { getSupabase } from '../../shared/lib/supabase';
import { useAuthStore } from '../../shared/store/useAuthStore';
import { usePlannerStore } from '../store/usePlannerStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const theme = usePlannerStore((s) => s.theme);
  const toggleTheme = usePlannerStore((s) => s.toggleTheme);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        onPress: async () => {
          setLoggingOut(true);
          const supabase = getSupabase();
          if (supabase) await supabase.auth.signOut();
          await AsyncStorage.clear();
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This will permanently delete your account and all your data (tasks, notes, and preferences). This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            const supabase = getSupabase();
            if (!supabase || !user) return;
            try {
              await supabase.from('items').delete().eq('user_id', user.id);
              await supabase.from('user_preferences').delete().eq('user_id', user.id);
              await supabase.functions.invoke('delete-user');
              await AsyncStorage.clear();
              await supabase.auth.signOut();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      {user && (
        <Text style={styles.email}>{user.email}</Text>
      )}

      <TouchableOpacity style={styles.row} onPress={toggleTheme}>
        <Text style={styles.rowLabel}>Appearance</Text>
        <Text style={styles.rowValue}>{theme === 'dark' ? 'Dark' : 'Light'}</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity style={styles.row} onPress={handleLogout} disabled={loggingOut}>
        <Text style={styles.rowLabel}>Log out</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.row} onPress={handleDeleteAccount}>
        <Text style={[styles.rowLabel, { color: '#dc2626' }]}>Delete account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf9', paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: '700', color: '#1c1917', paddingTop: 16, marginBottom: 8 },
  email: { fontSize: 14, color: '#78716c', marginBottom: 24 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowLabel: { fontSize: 16, color: '#1c1917' },
  rowValue: { fontSize: 14, color: '#78716c' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#e7e5e4', marginVertical: 8 },
});
