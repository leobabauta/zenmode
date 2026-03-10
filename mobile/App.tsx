import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
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
import { TaskDetailScreen } from './src/screens/TaskDetailScreen';

// Initialize Supabase and sync
setupSupabase();
setupSync();

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ label, focused, color }: { label: string; focused: boolean; color: string }) {
  // SVG icon paths matching the PWA's Heroicons outline style
  const iconPaths: Record<string, string> = {
    Today: 'M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z',
    Timeline: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
    Inbox: 'M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z',
    Lists: 'M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
  };

  const Svg = require('react-native-svg').default;
  const { Path } = require('react-native-svg');

  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d={iconPaths[label] ?? ''}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MainTabs() {
  const colors = useColors();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }) => <TabIcon label={route.name} focused={focused} color={color} />,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          height: 56,
          paddingBottom: 4,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
      })}
    >
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="Timeline" component={TimelineScreen} />
      <Tab.Screen name="Inbox" component={InboxScreen} />
      <Tab.Screen name="Lists" component={ListsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const { user, loading } = useAuthStore();

  // Handle deep link auth callback (OAuth redirect back to app)
  useEffect(() => {
    const handleUrl = async (url: string) => {
      const supabase = getSupabase();
      if (!supabase) return;

      // Parse params from query string or hash fragment
      const queryIndex = url.indexOf('?');
      const hashIndex = url.indexOf('#');
      let paramStr = '';
      if (queryIndex !== -1) paramStr = url.substring(queryIndex + 1, hashIndex !== -1 ? hashIndex : undefined);
      if (hashIndex !== -1) paramStr = paramStr ? paramStr + '&' + url.substring(hashIndex + 1) : url.substring(hashIndex + 1);
      if (!paramStr) return;

      const params = new URLSearchParams(paramStr);

      // Google ID token flow (from expo-auth-session callback page)
      const idToken = params.get('id_token');
      if (idToken) {
        await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
        return;
      }

      // Supabase session token flow (magic link, etc.)
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      }
    };

    // Handle URL that launched the app
    Linking.getInitialURL().then((url) => { if (url) handleUrl(url); });

    // Handle URLs while app is running
    const sub = Linking.addEventListener('url', (event) => handleUrl(event.url));
    return () => sub.remove();
  }, []);

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
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              {user ? (
                <>
                  <Stack.Screen name="Main" component={MainTabs} />
                  <Stack.Screen name="Settings" component={SettingsScreen} />
                  <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
                  <Stack.Screen name="FocusTimer" component={FocusTimerScreen} />
                </>
              ) : (
                <Stack.Screen name="Login" component={LoginScreen} />
              )}
            </Stack.Navigator>
          </NavigationContainer>
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
