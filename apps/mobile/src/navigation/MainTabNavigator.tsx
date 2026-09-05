import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import PagerView from 'react-native-pager-view';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Home from '../screens/paciente/dashboard/home';
import Dados from '../screens/paciente/dashboard/dados';
import Chat from '../screens/paciente/chat/chat';
import SOS from '../screens/paciente/sos/sos';
import BemEstar from '../screens/paciente/BemEstar/BemEstar';
import Escalas from '../screens/paciente/escalas/escalas';
import { useTheme } from '../theme/ThemeContext';


export type MainTabParamList = {
  Home: undefined;
  Dados: undefined;
  Chat: undefined;
  Escalas: undefined;
  BemEstar: undefined;
  SOS: undefined;
};

const ABAS = [
  { nome: 'Home', rotulo: 'Início', icone: 'home' },
  { nome: 'Dados', rotulo: 'Dados', icone: 'bar-chart-2' },
  { nome: 'Chat', rotulo: 'Chat', icone: 'message-circle' },
  { nome: 'Escalas', rotulo: 'Escalas', icone: 'clipboard' },
  { nome: 'Bem Estar', rotulo: 'Bem Estar', icone: 'star' },
  { nome: 'SOS', rotulo: 'SOS', icone: 'alert-circle' },
] as const;


// PagerView para as páginas, alterando por posições de cada página.
export default function MainTabNavigator() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [ativo, setAtivo] = useState(0);
  const pager = useRef<PagerView>(null);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
     <PagerView
        ref={pager}
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={e => setAtivo(e.nativeEvent.position)}
      >
        <View key="home" style={{ flex: 1 }}>
          <Home />
        </View>
        <View key="dados" style={{ flex: 1 }}>
          <Dados />
        </View>
        <View key="chat" style={{ flex: 1 }}>
          <Chat />
        </View>
        <View key="escalas" style={{ flex: 1 }}>
          <Escalas />
        </View>
        <View key="bem-estar" style={{ flex: 1 }}>
          <BemEstar onVoltar={() => pager.current?.setPage(0)} />
        </View>
        <View key="sos" style={{ flex: 1 }}>
          <SOS />
        </View>
      </PagerView>

      <View
        style={[
          styles.barra,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.outline,
            height: 65 + insets.bottom,
            paddingBottom: 10 + insets.bottom,
          },
        ]}
      >
        {ABAS.map((aba, indice) => {
          const ligada = indice === ativo;

          // Crise não espera foco de aba: o SOS é sempre vermelho.
          const tinta = aba.nome === 'SOS'
            ? theme.colors.error
            : ligada
              ? theme.colors.primary
              : theme.colors.onSurfaceVariant;
          return (
            <TouchableOpacity
              key={aba.nome}
              style={styles.aba}
              onPress={() => pager.current?.setPage(indice)}
              accessibilityRole="tab"
              accessibilityState={{ selected: ligada }}
              accessibilityLabel={aba.rotulo}
            >
              <Feather name={aba.icone} size={22} color={tinta} />
              <Text
                style={[
                  styles.abaRotulo,
                  { color: tinta },
                  aba.nome === 'SOS' && { fontWeight: '700' as const },
                ]}
                maxFontSizeMultiplier={1.4}
              >
                {aba.rotulo}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  aba: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  abaRotulo: {
    fontSize: 12,
    fontWeight: '500',
  },
});
