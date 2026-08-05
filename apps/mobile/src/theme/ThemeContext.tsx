import React, { createContext, useContext, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { theme, AppTheme } from './index';

interface ThemeContextType {
  theme: AppTheme;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const currentTheme = isDark ? theme.dark : theme.light;

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, isDark }}>
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
