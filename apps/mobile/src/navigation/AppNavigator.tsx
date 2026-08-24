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

export type RootStackParamList = {
  Login: undefined;
  Registro: undefined;
  Vinculacao: undefined;
  Main: undefined;
  EsqueciSenha: undefined;
  VerificarCodigo: { email: string; modo: 'cadastro' | 'recuperacao' };
  NovaSenha: { token: string };
  Checkin: undefined;
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}