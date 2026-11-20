import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import * as Notifications from 'expo-notifications';
import { carregarHapticos } from './src/lib/hapticos';
import { lembretesSuportados } from './src/lib/lembretes';

// Com o app aberto, o lembrete também aparece (banner e lista), sem som.
if (lembretesSuportados) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
  });
}

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


