import { useState } from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { getSupabase } from '../../../shared/lib/supabase';
import { useAuthStore } from '../../../shared/store/useAuthStore';
import { usePlannerStore } from '../store/usePlannerStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors, COLOR_PRESETS } from '../lib/colors';
import { schedulePlanningReminder, cancelPlanningReminder, requestNotificationPermissions } from '../lib/notifications';

const HOUR_OPTIONS = [
  { label: '5:00 AM', value: 5 },
  { label: '6:00 AM', value: 6 },
  { label: '7:00 AM', value: 7 },
  { label: '8:00 AM', value: 8 },
  { label: '9:00 AM', value: 9 },
  { label: '10:00 AM', value: 10 },
];

function formatHour(hour: number): string {
  return HOUR_OPTIONS.find((o) => o.value === hour)?.label ?? `${hour}:00`;
}

export function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const theme = usePlannerStore((s) => s.theme);
  const accentColor = usePlannerStore((s) => s.accentColor);
  const planningRitualEnabled = usePlannerStore((s) => s.planningRitualEnabled);
  const planningRitualHour = usePlannerStore((s) => s.planningRitualHour);
  const toggleTheme = usePlannerStore((s) => s.toggleTheme);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const [showTimePicker, setShowTimePicker] = useState(false);

  const setAccentColor = (id: string | null) => {
    usePlannerStore.setState({ accentColor: id });
  };

  const handleToggleMorningNudge = async (enabled: boolean) => {
    usePlannerStore.setState({ planningRitualEnabled: enabled });
    if (enabled) {
      const granted = await requestNotificationPermissions();
      if (granted) {
        await schedulePlanningReminder(planningRitualHour);
      } else {
        Alert.alert('Notifications disabled', 'Please enable notifications in your device settings to receive morning reminders.');
        usePlannerStore.setState({ planningRitualEnabled: false });
      }
    } else {
      await cancelPlanningReminder();
    }
  };

  const handleSetHour = async (hour: number) => {
    usePlannerStore.setState({ planningRitualHour: hour });
    setShowTimePicker(false);
    if (planningRitualEnabled) {
      await schedulePlanningReminder(hour);
    }
  };

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

  const activeId = accentColor || 'default';

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.accent }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scrollContent}>
        {user && (
          <Text style={[styles.email, { color: colors.textSecondary }]}>{user.email}</Text>
        )}

        {/* Appearance */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.row} onPress={toggleTheme}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Appearance</Text>
            <Text style={[styles.rowValue, { color: colors.textSecondary }]}>{theme === 'dark' ? 'Dark' : 'Light'}</Text>
          </TouchableOpacity>
        </View>

        {/* Accent color */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ACCENT COLOR</Text>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.colorGrid}>
            {COLOR_PRESETS.map((preset) => {
              const isActive = preset.id === activeId;
              return (
                <TouchableOpacity
                  key={preset.id}
                  onPress={() => setAccentColor(preset.id === 'default' ? null : preset.id)}
                  style={styles.colorItem}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: preset.swatch },
                      isActive && { borderWidth: 3, borderColor: colors.text },
                    ]}
                  />
                  <Text
                    style={[
                      styles.colorLabel,
                      { color: isActive ? colors.text : colors.textMuted },
                      isActive && { fontWeight: '600' },
                    ]}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Notifications */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>NOTIFICATIONS</Text>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Morning nudge</Text>
            <Switch
              value={planningRitualEnabled}
              onValueChange={handleToggleMorningNudge}
              trackColor={{ false: colors.border, true: colors.accent }}
            />
          </View>

          {planningRitualEnabled && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <TouchableOpacity style={styles.row} onPress={() => setShowTimePicker(!showTimePicker)}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>Time</Text>
                <Text style={[styles.rowValue, { color: colors.textSecondary }]}>{formatHour(planningRitualHour)}</Text>
              </TouchableOpacity>

              {showTimePicker && (
                <View style={styles.timePickerGrid}>
                  {HOUR_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.timePill,
                        { backgroundColor: colors.bg },
                        planningRitualHour === opt.value && { backgroundColor: colors.accent },
                      ]}
                      onPress={() => handleSetHour(opt.value)}
                    >
                      <Text
                        style={[
                          styles.timePillText,
                          { color: colors.text },
                          planningRitualHour === opt.value && { color: colors.accentText, fontWeight: '600' },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        <Text style={[styles.nudgeDescription, { color: colors.textMuted }]}>
          Get a gentle reminder each morning to review your plan for the day.
        </Text>

        {/* Account */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.row} onPress={handleLogout}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Log out</Text>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.row} onPress={handleDeleteAccount}>
            <Text style={[styles.rowLabel, { color: colors.danger }]}>Delete account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  backButton: { width: 60 },
  backText: { fontSize: 15 },
  title: { fontSize: 17, fontWeight: '600' },
  email: { fontSize: 14, paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: {
    fontSize: 12, fontWeight: '600', letterSpacing: 0.5,
    paddingHorizontal: 20, marginBottom: 8,
  },
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
  colorGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, paddingVertical: 12,
    gap: 4,
  },
  colorItem: {
    alignItems: 'center',
    width: 58,
    paddingVertical: 8,
  },
  swatch: {
    width: 32, height: 32, borderRadius: 16,
    marginBottom: 4,
  },
  colorLabel: {
    fontSize: 10,
  },
  timePickerGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, paddingBottom: 12,
    gap: 8,
  },
  timePill: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20,
  },
  timePillText: {
    fontSize: 13,
  },
  nudgeDescription: {
    fontSize: 13,
    paddingHorizontal: 24,
    marginTop: -16,
    marginBottom: 24,
    lineHeight: 18,
  },
});
