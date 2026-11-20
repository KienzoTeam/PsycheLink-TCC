import React, { memo, startTransition, useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import PagerView from 'react-native-pager-view';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Home from '../screens/paciente/dashboard/home';
import Dados from '../screens/paciente/dashboard/dados';
import SOS from '../screens/paciente/sos/sos';
import BemEstar from '../screens/paciente/BemEstar/BemEstar';
import Escalas from '../screens/paciente/escalas/escalas';
import { useTheme } from '../theme/ThemeContext';
import type { RootStackParamList } from './AppNavigator';


export type MainTabParamList = {
  Home: undefined;
  Dados: undefined;
  Escalas: undefined;
  BemEstar: undefined;
  SOS: undefined;
};

const ABAS = [
  { nome: 'Home', rotulo: 'Início', icone: 'home' },
  { nome: 'Dados', rotulo: 'Dados', icone: 'bar-chart-2' },
  { nome: 'Escalas', rotulo: 'Escalas', icone: 'clipboard' },
  { nome: 'Bem Estar', rotulo: 'Bem Estar', icone: 'star' },
  { nome: 'SOS', rotulo: 'SOS', icone: 'alert-circle' },
] as const;

// Trocar de aba re-renderiza o navigator; memoizadas, as páginas só re-renderizam pelo próprio
// estado (Escalas também quando `ativa` muda).
const HomePagina = memo(Home);
const DadosPagina = memo(Dados);
const EscalasPagina = memo(Escalas);
const BemEstarPagina = memo(BemEstar);
const SOSPagina = memo(SOS);

// PagerView para as páginas, alterando por posições de cada página.
export default function MainTabNavigator({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Main'>) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [ativo, setAtivo] = useState(0);
  // Cada página monta na primeira visita: o pós-login monta (e busca dados de) só a Home.
  const [montadas, setMontadas] = useState<ReadonlySet<number>>(() => new Set([0]));
  const pager = useRef<PagerView>(null);
  const voltarParaInicio = useCallback(() => pager.current?.setPage(0), []);

  // Telas empilhadas por cima (ex.: escala respondida) pedem uma aba ao voltar.
  const abaPedida = route.params?.aba;
  useEffect(() => {
    if (!abaPedida) return;
    pager.current?.setPage(ABAS.findIndex(aba => aba.nome === abaPedida));
    navigation.setParams({ aba: undefined });
  }, [abaPedida, navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
     <PagerView
        ref={pager}
        style={{ flex: 1 }}
        initialPage={0}
        onPageScrollStateChanged={e => {
          // Arraste começou: monta as vizinhas antes de elas entrarem na tela.
          // Montar é a parte pesada: em transição, não segura a cor da barra.
          if (e.nativeEvent.pageScrollState === 'dragging') {
            startTransition(() => setMontadas(atual => new Set([...atual, ativo - 1, ativo + 1])));
          }
        }}
        // A aba acende quando a página passa da metade, sem esperar o arraste soltar.
        onPageScroll={e => setAtivo(Math.round(e.nativeEvent.position + e.nativeEvent.offset))}
        onPageSelected={e => {
          const pagina = e.nativeEvent.position;
          setAtivo(pagina);
          startTransition(() => setMontadas(atual => new Set(atual).add(pagina)));
        }}
      >
        <View key="home" style={{ flex: 1 }}>
          {montadas.has(0) && <HomePagina />}
        </View>
        <View key="dados" style={{ flex: 1 }}>
          {montadas.has(1) && <DadosPagina ativa={ABAS[ativo].nome === 'Dados'} />}
        </View>
        <View key="escalas" style={{ flex: 1 }}>
          {montadas.has(2) && <EscalasPagina ativa={ABAS[ativo].nome === 'Escalas'} />}
        </View>
        <View key="bem-estar" style={{ flex: 1 }}>
          {montadas.has(3) && <BemEstarPagina onVoltar={voltarParaInicio} ativa={ABAS[ativo].nome === 'Bem Estar'} />}
        </View>
        <View key="sos" style={{ flex: 1 }}>
          {montadas.has(4) && <SOSPagina ativa={ABAS[ativo].nome === 'SOS'} />}
        </View>
      </PagerView>

      <View
        style={[
          styles.barra,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.outlineVariant,
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
              onPress={() => {
                setAtivo(indice);
                pager.current?.setPage(indice);
              }}
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
