import { DarkTheme, DefaultTheme, NavigationContainer, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
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

export type RootStackParamList = {
  Login: undefined;
  Registro: undefined;
  Vinculacao: undefined;
  Main: { aba?: 'Home' | 'SOS' } | undefined;
  EsqueciSenha: undefined;
  VerificarCodigo: { email: string; modo: 'cadastro' | 'recuperacao' };
  NovaSenha: { token: string };
  Checkin: undefined;
  BemEstar: undefined;
  Dados: undefined;
  Consultas: undefined;
  ResponderEscala: { aplicacaoId: number };
  Consentimento: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Stack raiz. `fade_from_bottom`: entrada suave subindo com fade em todas
 * as telas (nativo do native-stack, roda fora do JS). Main entra via
 * reset (sem transição) e as abas trocam instantâneo, como manda a plataforma.
 */
export default function AppNavigator() {
  const { theme, isDark } = useTheme();

  // Transições e fundos do stack acompanham o nosso tema (sem flash claro no escuro).
  const navigationTheme: Theme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.onBackground,
      border: theme.colors.outline,
      notification: theme.colors.error,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}
      >
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Registro" component={Registro} />
        <Stack.Screen name="EsqueciSenha" component={EsqueciSenha} />
        <Stack.Screen name="VerificarCodigo" component={VerificarCodigo} />
        <Stack.Screen name="NovaSenha" component={NovaSenha} />
        <Stack.Screen name="Vinculacao" component={Vinculacao} />
        <Stack.Screen name="Main" component={MainTabNavigator} />
        <Stack.Screen name="Checkin" component={Checkin} />
         <Stack.Screen name="Dados" component={Dados} />
        <Stack.Screen name="Consultas" component={Consultas} />
        <Stack.Screen name="ResponderEscala" component={ResponderEscala} />
        <Stack.Screen name="Consentimento" component={Consentimento} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}