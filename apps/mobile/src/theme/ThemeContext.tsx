import React, { createContext, useCallback, useContext, ReactNode, useEffect, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { theme, AppTheme } from './index';

export type ThemeMode = 'system' | 'light' | 'dark';

const MODE_KEY = 'psychelink_theme_mode';

interface ThemeContextType {
  theme: AppTheme;
  isDark: boolean;
  /** Preferência do usuário; 'system' segue o aparelho. */
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

async function carregarModo(): Promise<ThemeMode> {
  try {
    const bruto =
      Platform.OS === 'web'
        ? localStorage.getItem(MODE_KEY)
        : await SecureStore.getItemAsync(MODE_KEY);
    return bruto === 'light' || bruto === 'dark' ? bruto : 'system';
  } catch {
    return 'system';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const colorScheme = useColorScheme();
  const [modo, setModoEstado] = useState<ThemeMode>('system');

  // Restaura a preferência salva; 'system' até lá.
  useEffect(() => {
    void carregarModo().then(setModoEstado);
  }, []);

  const setMode = useCallback((novo: ThemeMode) => {
    setModoEstado(novo);
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(MODE_KEY, novo);
      } else {
        void SecureStore.setItemAsync(MODE_KEY, novo);
      }
    } catch {
      // Sem persistência: o tema ainda vale para esta sessão.
    }
  }, []);

  const efetivo: 'light' | 'dark' =
    modo === 'system' ? (colorScheme === 'dark' ? 'dark' : 'light') : modo;
  const isDark = efetivo === 'dark';
  const currentTheme = isDark ? theme.dark : theme.light;

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, isDark, mode: modo, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
