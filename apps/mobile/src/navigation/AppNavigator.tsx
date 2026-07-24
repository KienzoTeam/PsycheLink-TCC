import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Login from '../screens/Login/login';
import Registro from '../screens/registro/registro';
import EsqueciSenha from '../screens/EsqueciSenha/esqueciSenha';
import VerificarCodigo from '../screens/EsqueciSenha/verificarCodigo';
import NovaSenha from '../screens/EsqueciSenha/novaSenha';
import Vinculacao from '../screens/registro/vinculacao';
import MainTabNavigator from './MainTabNavigator';

export type RootStackParamList = {
  Login: undefined;
  Registro: undefined;
  Vinculacao: undefined;
  Main: undefined;  
  EsqueciSenha: undefined;
  VerificarCodigo: { email: string };
  NovaSenha: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Registro" component={Registro} />
        <Stack.Screen name="EsqueciSenha" component={EsqueciSenha} />
        <Stack.Screen name="VerificarCodigo" component={VerificarCodigo} />
        <Stack.Screen name="NovaSenha" component={NovaSenha} />
        <Stack.Screen name="Vinculacao" component={Vinculacao} />
        <Stack.Screen name="Main" component={MainTabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
