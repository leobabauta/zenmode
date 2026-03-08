import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { getSupabase } from '../../../shared/lib/supabase';
import { useAuthStore } from '../../../shared/store/useAuthStore';
import { usePlannerStore } from '../store/usePlannerStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '../lib/colors';

export function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const theme = usePlannerStore((s) => s.theme);
  const toggleTheme = usePlannerStore((s) => s.toggleTheme);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useColors();

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
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.textSecondary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      {user && (
        <Text style={[styles.email, { color: colors.textSecondary }]}>{user.email}</Text>
      )}

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity style={styles.row} onPress={toggleTheme}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Appearance</Text>
          <Text style={[styles.rowValue, { color: colors.textSecondary }]}>{theme === 'dark' ? 'Dark' : 'Light'}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity style={styles.row} onPress={handleLogout}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Log out</Text>
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <TouchableOpacity style={styles.row} onPress={handleDeleteAccount}>
          <Text style={[styles.rowLabel, { color: colors.danger }]}>Delete account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  backButton: { width: 60 },
  backText: { fontSize: 15 },
  title: { fontSize: 17, fontWeight: '600' },
  email: { fontSize: 14, paddingHorizontal: 20, marginBottom: 24 },
  section: {
    marginHorizontal: 20, marginBottom: 24,
    borderRadius: 12, borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowLabel: { fontSize: 16 },
  rowValue: { fontSize: 14 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
});
