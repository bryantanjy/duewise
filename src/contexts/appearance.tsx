import Storage from 'expo-sqlite/kv-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Uniwind, useUniwind } from 'uniwind';

export type AppearancePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'duewise.appearance';

function savedPreference(): AppearancePreference {
  try {
    const saved = Storage.getItemSync(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system';
  }
}

type AppearanceContextValue = {
  preference: AppearancePreference;
  resolvedTheme: 'light' | 'dark';
  setPreference: (next: AppearancePreference) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<AppearancePreference>(savedPreference);
  const { theme } = useUniwind();

  useEffect(() => {
    Uniwind.setTheme(preference);
  }, [preference]);

  const setPreference = useCallback((next: AppearancePreference) => {
    setPreferenceState(next);
    Uniwind.setTheme(next);
    try {
      Storage.setItemSync(STORAGE_KEY, next);
    } catch {
      // The in-session choice still applies if storage is temporarily unavailable.
    }
  }, []);

  const value = useMemo<AppearanceContextValue>(() => ({
    preference,
    resolvedTheme: theme === 'dark' ? 'dark' : 'light',
    setPreference,
  }), [preference, setPreference, theme]);

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error('useAppearance must be used inside AppearanceProvider');
  return context;
}
