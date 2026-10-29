import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View,StyleSheet,} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../../theme/ThemeContext';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import {  buscarResumoCheckins, ResumoCheckins,} from '../../../lib/checkinService';
import { rotularEmocao } from '../../../lib/emocoes';

// Paleta pro gráfico de barras — na ordem em que as emoções mais frequentes
// aparecem (a mais citada pega a primeira cor).
const CORES_BARRAS = ['#6C4CE0', '#4B32B0', '#B9CFFB', '#D9CFF8', '#F4A6B0'];

const COR_HUMOR = '#6C4CE0';
const COR_ANSIEDADE = '#F4645C';

// '2026-05-20' → '20/05'
function formatarDataCurta(iso: string) {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
}

type Props = Partial<NativeStackScreenProps<RootStackParamList, 'Dados'>>;

export default function MeusDados({ navigation }: Props) {
  const { theme } = useTheme();

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [resumo, setResumo] = useState<ResumoCheckins | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const dados = await buscarResumoCheckins();
      setResumo(dados);
    } catch (error: any) {
      setErro(
        error.response?.data?.error ||
          'Não foi possível carregar seus dados agora.',
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const temSerieTemporal = (resumo?.serieTemporal.length ?? 0) > 0;
  const temFrequencia = (resumo?.frequenciaEmocional.length ?? 0) > 0;

  const dadosHumor =
    resumo?.serieTemporal.map((ponto) => ({
      value: ponto.humor ?? 0,
      label: formatarDataCurta(ponto.data),
    })) ?? [];

  const dadosAnsiedade =
    resumo?.serieTemporal.map((ponto) => ({
      value: ponto.ansiedade ?? 0,
    })) ?? [];

  const dadosFrequencia =
    resumo?.frequenciaEmocional.map((item, indice) => ({
      value: item.quantidade,
      label: rotularEmocao(item.emocao),
      frontColor: CORES_BARRAS[indice % CORES_BARRAS.length],
    })) ?? [];

  // SafeAreaView do safe-area-context: o do react-native não afasta o cabeçalho da status bar
  // no Android. Só o topo: embaixo quem cuida do inset é a barra de abas.
  return (
    <SafeAreaView edges={['top']} style={[estilos.tela, { backgroundColor: theme.colors.background }]}>
      <View style={estilos.cabecalho}>
        {/* Como aba (sem `navigation`) não há para onde voltar: o espaço fica para manter o título centralizado. */}
        {navigation ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={11}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <Feather name="arrow-left" size={22} color={theme.colors.onBackground} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 22 }} />
        )}

        <Text style={[estilos.tituloCabecalho, { color: theme.colors.onBackground }]}>
          Meus Dados
        </Text>

        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={estilos.conteudo}
        showsVerticalScrollIndicator={false}
      >
        {carregando && (
          <View style={estilos.centralizado}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        )}

        {!carregando && erro && (
          <View style={estilos.centralizado}>
            <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              {erro}
            </Text>
            <TouchableOpacity onPress={carregar} style={estilos.botaoTentarDeNovo}>
              <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
                Tentar de novo
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!carregando && !erro && (
          <>
            <View style={[estilos.cartao, { backgroundColor: theme.colors.surface }]}>
              <View style={estilos.cartaoTituloLinha}>
                <Feather name="trending-up" size={18} color={theme.colors.primary} />
                <Text style={[estilos.cartaoTitulo, { color: theme.colors.onSurface }]}>
                  Como você tem se sentido
                </Text>
              </View>

              {temSerieTemporal ? (
                <>
                  <LineChart
                    data={dadosHumor}
                    data2={dadosAnsiedade}
                    color1={COR_HUMOR}
                    color2={COR_ANSIEDADE}
                    thickness1={3}
                    thickness2={3}
                    curved
                    dataPointsColor1={COR_HUMOR}
                    dataPointsColor2={COR_ANSIEDADE}
                    maxValue={10}
                    noOfSections={4}
                    yAxisColor="transparent"
                    xAxisColor={theme.colors.outline}
                    rulesColor={theme.colors.outline}
                    yAxisTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 11 }}
                    xAxisLabelTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 11 }}
                    initialSpacing={16}
                    spacing={44}
                    height={180}
                    adjustToWidth
                  />

                  <View style={estilos.legenda}>
                    <View style={estilos.legendaItem}>
                      <View style={[estilos.legendaBolinha, { backgroundColor: COR_HUMOR }]} />
                      <Text style={{ color: theme.colors.onSurfaceVariant }}>Humor</Text>
                    </View>
                    <View style={estilos.legendaItem}>
                      <View style={[estilos.legendaBolinha, { backgroundColor: COR_ANSIEDADE }]} />
                      <Text style={{ color: theme.colors.onSurfaceVariant }}>Ansiedade</Text>
                    </View>
                  </View>
                </>
              ) : (
                <Text style={{ color: theme.colors.onSurfaceVariant, paddingVertical: 24 }}>
                  Faça alguns check-ins para ver sua evolução aqui.
                </Text>
              )}
            </View>

            <View style={[estilos.cartao, { backgroundColor: theme.colors.surface }]}>
              <View style={estilos.cartaoTituloLinha}>
                <Feather name="activity" size={18} color={theme.colors.primary} />
                <Text style={[estilos.cartaoTitulo, { color: theme.colors.onSurface }]}>
                  Histórico emocional
                </Text>
              </View>

              {temFrequencia ? (
                <BarChart
                  data={dadosFrequencia}
                  horizontal
                  barWidth={18}
                  spacing={22}
                  maxValue={Math.max(20, ...dadosFrequencia.map((d) => d.value))}
                  noOfSections={4}
                  yAxisTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
                  xAxisLabelTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 11 }}
                  xAxisColor={theme.colors.outline}
                  rulesColor={theme.colors.outline}
                  hideYAxisText={false}
                  height={180}
                />
              ) : (
                <Text style={{ color: theme.colors.onSurfaceVariant, paddingVertical: 24 }}>
                  Ainda não há emoções suficientes registradas.
                </Text>
              )}
            </View>

            <View style={estilos.avisoPrivacidade}>
              <Feather name="lock" size={14} color={theme.colors.onSurfaceVariant} />
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, flex: 1 }}>
                Esses gráficos são só pra você acompanhar sua própria jornada.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: {
   flex: 1,
  },
  
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  tituloCabecalho: {
    fontSize: 18,
    fontWeight: '700',
  },

  conteudo: {
    padding: 16,
    gap: 16,
  },

  centralizado: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },

  botaoTentarDeNovo: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },

  cartao: {
    borderRadius: 20,
    padding: 16,
  },

  cartaoTituloLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },

  cartaoTitulo: {
    fontSize: 16,
    fontWeight: '700',
  },

  legenda: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 12,
  },

  legendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  legendaBolinha: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  avisoPrivacidade: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
});