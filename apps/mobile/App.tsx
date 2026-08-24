import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { carregarHapticos } from './src/lib/hapticos';

/** StatusBar acompanha o tema: ícones claros no escuro, escuros no claro. */
function BarraDeStatus() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export default function App() {
  // Restaura a preferência de vibração antes do primeiro toque.
  useEffect(() => {
    void carregarHapticos();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <BarraDeStatus />
        <AppNavigator />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}


