import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Login from '../screens/auth/login';
import Registro from '../screens/auth/registro';
import EsqueciSenha from '../screens/auth/esqueciSenha';
import VerificarCodigo from '../screens/auth/verificarCodigo';
import VerificarEmail from '../screens/auth/verificarEmail';
import NovaSenha from '../screens/auth/novaSenha';
import Vinculacao from '../screens/auth/vinculacao';
import MainTabNavigator from './MainTabNavigator';

export type RootStackParamList = {
  Login: undefined;
  Registro: undefined;
  VerificarEmail: { email: string };
  Vinculacao: undefined;
  Main: undefined;
  EsqueciSenha: undefined;
  VerificarCodigo: { email: string };
  NovaSenha: { email: string; code: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Registro" component={Registro} />
        <Stack.Screen name="VerificarEmail" component={VerificarEmail} />
        <Stack.Screen name="EsqueciSenha" component={EsqueciSenha} />
        <Stack.Screen name="VerificarCodigo" component={VerificarCodigo} />
        <Stack.Screen name="NovaSenha" component={NovaSenha} />
        <Stack.Screen name="Vinculacao" component={Vinculacao} />
        <Stack.Screen name="Main" component={MainTabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
