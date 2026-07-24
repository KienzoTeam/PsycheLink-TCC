import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import Home from '../screens/paciente/dashboard/home';
import Checkin from '../screens/paciente/checkin/checkin';
import Dados from '../screens/paciente/dashboard/dados';
import Chat from '../screens/paciente/chat/chat';
import SOS from '../screens/paciente/sos/sos';
import { useTheme } from '../theme/ThemeContext';

export type MainTabParamList = {
  Home: undefined;
  Checkin: undefined;
  Dados: undefined;
  Chat: undefined;
  SOS: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          height: 65,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Feather.glyphMap = 'home';

          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Checkin') iconName = 'heart';
          else if (route.name === 'Dados') iconName = 'bar-chart-2';
          else if (route.name === 'Chat') iconName = 'message-circle';
          else if (route.name === 'SOS') iconName = 'alert-circle';

          return <Feather name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={Home} 
        options={{ tabBarLabel: 'Início' }}
      />
      <Tab.Screen 
        name="Checkin" 
        component={Checkin} 
        options={{ tabBarLabel: 'Check-in' }}
      />
      <Tab.Screen 
        name="Dados" 
        component={Dados} 
        options={{ tabBarLabel: 'Dados' }}
      />
      <Tab.Screen 
        name="Chat" 
        component={Chat} 
        options={{ tabBarLabel: 'Chat' }}
      />
      <Tab.Screen 
        name="SOS" 
        component={SOS} 
        options={{ tabBarLabel: 'SOS' }}
      />
    </Tab.Navigator>
  );
}
