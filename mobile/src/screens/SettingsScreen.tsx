import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { getSupabase } from '../../shared/lib/supabase';
import { useAuthStore } from '../../shared/store/useAuthStore';
import { usePlannerStore } from '../store/usePlannerStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const theme = usePlannerStore((s) => s.theme);
  const toggleTheme = usePlannerStore((s) => s.toggleTheme);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        onPress: async () => {
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
      'This will permanently delete your account and all your data. This cannot be undone.',
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
            } catch {
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      {user && (
        <Text style={styles.email}>{user.email}</Text>
      )}

      <View style={styles.section}>
        <TouchableOpacity style={styles.row} onPress={toggleTheme}>
          <Text style={styles.rowLabel}>Appearance</Text>
          <Text style={styles.rowValue}>{theme === 'dark' ? 'Dark' : 'Light'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.row} onPress={handleLogout}>
          <Text style={styles.rowLabel}>Log out</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.row} onPress={handleDeleteAccount}>
          <Text style={[styles.rowLabel, { color: '#dc2626' }]}>Delete account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf9' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  backButton: { width: 60 },
  backText: { fontSize: 15, color: '#78716c' },
  title: { fontSize: 17, fontWeight: '600', color: '#1c1917' },
  email: { fontSize: 14, color: '#78716c', paddingHorizontal: 20, marginBottom: 24 },
  section: {
    marginHorizontal: 20, marginBottom: 24, backgroundColor: '#fff',
    borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: '#e7e5e4',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowLabel: { fontSize: 16, color: '#1c1917' },
  rowValue: { fontSize: 14, color: '#78716c' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#e7e5e4', marginLeft: 16 },
});
