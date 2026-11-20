import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { createNavigationContainerRef, DarkTheme, DefaultTheme, NavigationContainer, Theme } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import Login from '../screens/auth/login';
import Registro from '../screens/auth/registro';
import EsqueciSenha from '../screens/auth/esqueciSenha';
import VerificarCodigo from '../screens/auth/verificarCodigo';
import NovaSenha from '../screens/auth/novaSenha';
import Vinculacao from '../screens/auth/vinculacao';
import MainTabNavigator from './MainTabNavigator';
import Checkin from '../screens/paciente/checkin/checkin';
import BemEstar from '../screens/paciente/BemEstar/BemEstar';
import Dados from '../screens/paciente/dashboard/dados';
import Consultas from '../screens/paciente/consultas/consultas';
import ResponderEscala from '../screens/paciente/escalas/responderEscala';
import Consentimento from '../screens/paciente/consentimento/consentimento';
import SOS from '../screens/paciente/sos/sos';
import ConfiguracoesConta from '../screens/paciente/conta/configuracoesConta';
import Privacidade from '../screens/paciente/conta/privacidade';
import Ajuda from '../screens/paciente/conta/ajuda';
import Diario from '../screens/paciente/diario/diario';
import Historico from '../screens/paciente/historico/historico';
import Notificacoes from '../screens/paciente/notificacoes/notificacoes';
import { lembretesSuportados } from '../lib/lembretes';

export type RootStackParamList = {
  Login: undefined;
  Registro: undefined;
  Vinculacao: undefined;
  Main: { aba?: 'Home' | 'SOS' } | undefined;
  EsqueciSenha: undefined;
  // No modo 'login', email é o mascarado que a API devolve (2FA).
  VerificarCodigo: { email: string; modo: 'cadastro' | 'recuperacao' } | { email: string; modo: 'login'; desafioId: string };
  NovaSenha: { token: string };
  Checkin: undefined;
  BemEstar: undefined;
  Dados: undefined;
  Consultas: undefined;
  ResponderEscala: { aplicacaoId: number };
  Consentimento: undefined;
  ConfiguracoesConta: undefined;
  Privacidade: undefined;
  Ajuda: undefined;
  Diario: undefined;
  Historico: undefined;
  Notificacoes: undefined;
  SOSPublico: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const navegacao = createNavigationContainerRef<RootStackParamList>();

// Toque num lembrete abre a tela que ele cita (Checkin ou Dados), só com a sessão ativa.
function abrirTelaDaNotificacao(resposta: Notifications.NotificationResponse | null) {
  const tela = resposta?.notification.request.content.data?.tela;
  if ((tela === 'Checkin' || tela === 'Dados') && navegacao.isReady()) navegacao.navigate(tela);
}

/**
 * Stack raiz. As telas mudam sozinhas conforme a sessão (sem navegar à mão entre os grupos).
 * `fade_from_bottom`: entrada suave subindo com fade em todas as telas (nativo do
 * native-stack, roda fora do JS). As abas trocam instantâneo, como manda a plataforma.
 */
export default function AppNavigator() {
  const { theme, isDark } = useTheme();
  const { sessao } = useAuth();

  // Transições e fundos do stack acompanham o nosso tema (sem flash claro no escuro).
  const navigationTheme = useMemo<Theme>(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme : DefaultTheme).colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.onBackground,
        border: theme.colors.outlineVariant,
        notification: theme.colors.error,
      },
    }),
    [theme, isDark],
  );

  useEffect(() => {
    if (!lembretesSuportados || sessao !== 'ativa') return;
    const assinatura = Notifications.addNotificationResponseReceivedListener(abrirTelaDaNotificacao);
    return () => assinatura.remove();
  }, [sessao]);

  // Token ainda sendo lido do armazenamento: só o fundo, sem piscar o Login.
  if (sessao === 'lendo') {
    return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
  }

  return (
    <NavigationContainer
      ref={navegacao}
      theme={navigationTheme}
      onReady={() => {
        // App aberto pelo toque num lembrete (estava fechado).
        if (!lembretesSuportados || sessao !== 'ativa') return;
        abrirTelaDaNotificacao(Notifications.getLastNotificationResponse());
        Notifications.clearLastNotificationResponse();
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
        {sessao === 'ativa' ? (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen name="Checkin" component={Checkin} />
            <Stack.Screen name="Dados" component={Dados} />
            <Stack.Screen name="Consultas" component={Consultas} />
            <Stack.Screen name="ResponderEscala" component={ResponderEscala} />
            <Stack.Screen name="Consentimento" component={Consentimento} />
            <Stack.Screen name="ConfiguracoesConta" component={ConfiguracoesConta} />
            <Stack.Screen name="Privacidade" component={Privacidade} />
            <Stack.Screen name="Ajuda" component={Ajuda} />
            <Stack.Screen name="Diario" component={Diario} />
            <Stack.Screen name="Historico" component={Historico} />
            <Stack.Screen name="Notificacoes" component={Notificacoes} />
            <Stack.Screen name="Vinculacao" component={Vinculacao} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Registro" component={Registro} />
            <Stack.Screen name="EsqueciSenha" component={EsqueciSenha} />
            <Stack.Screen name="VerificarCodigo" component={VerificarCodigo} />
            <Stack.Screen name="NovaSenha" component={NovaSenha} />
            {/* SOS sem login, com cabeçalho nativo (título e seta de voltar). */}
            <Stack.Screen name="SOSPublico" options={{ headerShown: true, title: 'SOS' }}>
              {() => <SOS comCabecalho />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}