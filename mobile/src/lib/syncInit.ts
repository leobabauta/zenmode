import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerStoreAccessors, registerStorage } from '../../../shared/lib/sync';
import { usePlannerStore } from '../store/usePlannerStore';

export function setupSync() {
  registerStoreAccessors({
    getItems: () => usePlannerStore.getState().items,
    setItems: (items) => usePlannerStore.setState({ items }),
    getPrefs: () => usePlannerStore.getState(),
    setPrefs: (prefs) => usePlannerStore.setState(prefs),
  });
  registerStorage(AsyncStorage);
}
