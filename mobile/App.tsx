import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from './src/components/Toast';

import { setupSupabase } from './src/lib/supabaseInit';
import { setupSync } from './src/lib/syncInit';
import { getSupabase } from '../shared/lib/supabase';
import { useAuthStore } from '../shared/store/useAuthStore';
import { pullFromSupabase, pullPreferences, flushChangedNow, flushDeletedNow, flushPreferencesNow } from '../shared/lib/sync';
import { requestNotificationPermissions } from './src/lib/notifications';
import { useColors } from './src/lib/colors';

import { LoginScreen } from './src/screens/LoginScreen';
import { TodayScreen } from './src/screens/TodayScreen';
import { TimelineScreen } from './src/screens/TimelineScreen';
import { InboxScreen } from './src/screens/InboxScreen';
import { ListsScreen } from './src/screens/ListsScreen';
import { FocusTimerScreen } from './src/screens/FocusTimerScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

// Initialize Supabase and sync
setupSupabase();
setupSync();

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Today: '☀️',
    Timeline: '📅',
    Inbox: '📥',
    Lists: '📋',
    Focus: '⏱',
  };
  return (
    <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.4 }}>
      {icons[label] ?? '•'}
    </Text>
  );
}

function MainTabs() {
  const colors = useColors();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
      })}
    >
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="Timeline" component={TimelineScreen} />
      <Tab.Screen name="Inbox" component={InboxScreen} />
      <Tab.Screen name="Lists" component={ListsScreen} />
      <Tab.Screen name="Focus" component={FocusTimerScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const { user, loading } = useAuthStore();

  // Listen for auth state changes
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      useAuthStore.getState().setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      useAuthStore.getState().setAuth(session?.user ?? null, session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        useAuthStore.getState().setAuth(session?.user ?? null, session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Pull data on login + request notification permissions
  useEffect(() => {
    if (!user) return;
    pullFromSupabase().then(() => pullPreferences());
    requestNotificationPermissions();
  }, [user]);

  // Sync on app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && user) {
        pullFromSupabase().then(() => pullPreferences());
      } else if (nextState === 'background') {
        flushChangedNow();
        flushDeletedNow();
        flushPreferencesNow();
      }
    });
    return () => subscription.remove();
  }, [user]);

  if (loading) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ToastProvider>
          <NavigationContainer>
            {user ? (
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Main" component={MainTabs} />
                <Stack.Screen name="Settings" component={SettingsScreen} />
              </Stack.Navigator>
            ) : (
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Login" component={LoginScreen} />
              </Stack.Navigator>
            )}
          </NavigationContainer>
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
