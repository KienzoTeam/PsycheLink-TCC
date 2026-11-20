import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../../theme/ThemeContext';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { buscarHistorico, Historico, RegistroHistorico } from '../../../lib/checkinService';
import { rotularEmocao } from '../../../lib/emocoes';
import FiltroPeriodo, { Periodo } from '../../../components/ui/FiltroPeriodo';

// Paleta do gráfico de emoções: a mais citada pega a primeira cor.
const CORES_BARRAS = ['#6C4CE0', '#4B32B0', '#B9CFFB', '#D9CFF8', '#F4A6B0'];
const COR_HUMOR = '#6C4CE0';
const COR_ANSIEDADE = '#F4645C';
const MINIMO_REGISTROS = 3; // F6: abaixo disso, alerta em vez de gráfico enganoso
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

type Ponto = { rotulo: string; humor: number | null; ansiedade: number | null; sono: number | null };

const media = (valores: (number | null)[]) => {
  const v = valores.filter((x): x is number => x !== null);
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
};

// Segunda-feira da semana de uma data 'YYYY-MM-DD'.
function inicioDaSemana(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Até 30 dias, um ponto por dia; 3 meses, média por semana; 12 meses, média por mês. */
function agrupar(registros: RegistroHistorico[], dias: Periodo): Ponto[] {
  const chave = (iso: string) => (dias <= 30 ? iso : dias === 90 ? inicioDaSemana(iso) : iso.slice(0, 7));
  const grupos = new Map<string, RegistroHistorico[]>();
  for (const r of [...registros].reverse()) grupos.set(chave(r.data), [...(grupos.get(chave(r.data)) ?? []), r]);
  return [...grupos.entries()].map(([k, rs]) => ({
    rotulo: dias === 365 ? MESES[Number(k.slice(5, 7)) - 1] : diaMes(k),
    humor: media(rs.map((r) => r.humor)),
    ansiedade: media(rs.map((r) => r.ansiedade)),
    sono: media(rs.map((r) => r.sonoHoras)),
  }));
}

// Rótulo do eixo X só a cada `passo` pontos, para não encavalar.
const rotulos = (pontos: Ponto[]) => {
  const passo = Math.ceil(pontos.length / 6);
  return pontos.map((p, i) => (i % passo === 0 ? p.rotulo : ''));
};

const UNIDADE: Record<Periodo, string> = { 7: '', 30: '', 90: 'Média por semana.', 365: 'Média por mês.' };

// ativa: como aba, recarrega toda vez que volta a ficar visível (check-in novo, outro período).
type Props = Partial<NativeStackScreenProps<RootStackParamList, 'Dados'>> & { ativa?: boolean };

export default function MeusDados({ navigation, ativa = true }: Props) {
  const { theme } = useTheme();
  // Como aba, a tela não recebe `navigation`: o hook serve para abrir o histórico.
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [dias, setDias] = useState<Periodo>(30);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [historico, setHistorico] = useState<Historico | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setHistorico(await buscarHistorico(dias));
    } catch (error: any) {
      setErro(error.response?.data?.error || 'Não foi possível carregar seus dados agora.');
    } finally {
      setCarregando(false);
    }
  }, [dias]);

  useEffect(() => {
    if (ativa) void carregar();
  }, [carregar, ativa]);

  const total = historico?.registros.length ?? 0;
  const pontos = historico ? agrupar(historico.registros, dias) : [];
  const eixoX = rotulos(pontos);
  // Dia sem sono informado fica fora do gráfico (desenhar 0 h seria mentira).
  const pontosSono = pontos.filter((p) => p.sono !== null);
  const textoEixo = { color: theme.colors.onSurfaceVariant, fontSize: 11 };
  const comum = {
    noOfSections: 4,
    yAxisColor: 'transparent',
    xAxisColor: theme.colors.outlineVariant,
    rulesColor: theme.colors.outlineVariant,
    yAxisTextStyle: textoEixo,
    xAxisLabelTextStyle: textoEixo,
    height: 160,
    adjustToWidth: true,
    xAxisLabelTexts: eixoX,
  };

  const cartao = (icone: React.ComponentProps<typeof Feather>['name'], titulo: string, filhos: React.ReactNode) => (
    <View style={[estilos.cartao, { backgroundColor: theme.colors.surface }]}>
      <View style={estilos.cartaoTituloLinha}>
        <Feather name={icone} size={18} color={theme.colors.primary} />
        <Text style={[estilos.cartaoTitulo, { color: theme.colors.onSurface }]} accessibilityRole="header">
          {titulo}
        </Text>
      </View>
      {filhos}
    </View>
  );

  const resumoFalado = (rotulo: string, valores: (number | null)[]) => {
    const m = media(valores);
    return m === null ? `${rotulo}: sem dados no período.` : `${rotulo}: média de ${m} no período.`;
  };

  return (
    <SafeAreaView edges={['top']} style={[estilos.tela, { backgroundColor: theme.colors.background }]}>
      <View style={estilos.cabecalho}>
        {navigation ? (
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={11} accessibilityRole="button" accessibilityLabel="Voltar">
            <Feather name="arrow-left" size={22} color={theme.colors.onBackground} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 22 }} />
        )}
        <Text style={[estilos.tituloCabecalho, { color: theme.colors.onBackground }]} accessibilityRole="header">
          Meus Dados
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={estilos.conteudo} showsVerticalScrollIndicator={false}>
        <FiltroPeriodo valor={dias} aoMudar={setDias} />

        {carregando && (
          <View style={estilos.centralizado} accessibilityRole="progressbar" accessibilityLabel="Carregando seus dados">
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        )}

        {!carregando && erro && (
          <View style={estilos.centralizado}>
            <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>{erro}</Text>
            <TouchableOpacity onPress={carregar} style={estilos.botaoTexto} accessibilityRole="button">
              <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Tentar de novo</Text>
            </TouchableOpacity>
          </View>
        )}

        {!carregando && !erro && historico && (
          <>
            {total < MINIMO_REGISTROS ? (
              <View
                style={[estilos.cartao, estilos.aviso, { backgroundColor: theme.colors.secondaryContainer }]}
                accessibilityRole="summary"
              >
                <Feather name="info" size={20} color={theme.colors.onSecondaryContainer} />
                <Text style={[estilos.avisoTexto, { color: theme.colors.onSecondaryContainer }]}>
                  {total === 0
                    ? 'Nenhum check-in neste período.'
                    : `${total === 1 ? 'Só 1 check-in' : `Só ${total} check-ins`} neste período.`}{' '}
                  Os gráficos aparecem a partir de {MINIMO_REGISTROS}, para não mostrar uma tendência que ainda não existe.
                </Text>
              </View>
            ) : (
              <>
                {UNIDADE[dias] !== '' && (
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>
                    {total} check-ins. {UNIDADE[dias]}
                  </Text>
                )}

                {cartao(
                  'trending-up',
                  'Humor',
                  <View accessible accessibilityLabel={resumoFalado('Humor, de 1 a 10', pontos.map((p) => p.humor))}>
                    <LineChart
                      {...comum}
                      data={pontos.map((p) => ({ value: p.humor ?? 0 }))}
                      color={COR_HUMOR}
                      dataPointsColor={COR_HUMOR}
                      thickness={3}
                      curved
                      maxValue={10}
                      initialSpacing={12}
                      hideDataPoints={pontos.length > 31}
                    />
                  </View>,
                )}

                {cartao(
                  'bar-chart-2',
                  'Ansiedade',
                  <View accessible accessibilityLabel={resumoFalado('Ansiedade, de 1 a 10', pontos.map((p) => p.ansiedade))}>
                    <BarChart
                      {...comum}
                      data={pontos.map((p) => ({ value: p.ansiedade ?? 0, frontColor: COR_ANSIEDADE }))}
                      maxValue={10}
                      barBorderRadius={3}
                      initialSpacing={8}
                      spacing={4}
                    />
                  </View>,
                )}

                {pontosSono.length >= 2 &&
                  cartao(
                    'moon',
                    'Sono (horas)',
                    <View accessible accessibilityLabel={resumoFalado('Sono em horas', pontosSono.map((p) => p.sono))}>
                      <LineChart
                        {...comum}
                        xAxisLabelTexts={rotulos(pontosSono)}
                        data={pontosSono.map((p) => ({ value: p.sono! }))}
                        color={theme.colors.tertiary}
                        dataPointsColor={theme.colors.tertiary}
                        thickness={3}
                        curved
                        maxValue={12}
                        initialSpacing={12}
                        hideDataPoints={pontosSono.length > 31}
                      />
                    </View>,
                  )}

                {historico.frequenciaEmocional.length > 0 &&
                  cartao(
                    'activity',
                    'Emoções mais frequentes',
                    <BarChart
                      data={historico.frequenciaEmocional.map((item, i) => ({
                        value: item.quantidade,
                        label: rotularEmocao(item.emocao),
                        frontColor: CORES_BARRAS[i % CORES_BARRAS.length],
                      }))}
                      horizontal
                      barWidth={18}
                      spacing={22}
                      maxValue={Math.max(5, ...historico.frequenciaEmocional.map((d) => d.quantidade))}
                      noOfSections={4}
                      yAxisTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
                      xAxisLabelTextStyle={textoEixo}
                      xAxisColor={theme.colors.outlineVariant}
                      rulesColor={theme.colors.outlineVariant}
                      height={180}
                    />,
                  )}
              </>
            )}

            {total > 0 && (
              <TouchableOpacity
                style={[estilos.botaoHistorico, { borderColor: theme.colors.outline }]}
                onPress={() => nav.navigate('Historico')}
                accessibilityRole="button"
              >
                <Feather name="list" size={18} color={theme.colors.primary} />
                <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 15 }}>Ver cada check-in</Text>
              </TouchableOpacity>
            )}

            <View style={estilos.avisoPrivacidade}>
              <Feather name="lock" size={14} color={theme.colors.onSurfaceVariant} />
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, flex: 1 }}>
                Esses gráficos são só para você acompanhar sua própria jornada.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tituloCabecalho: { fontSize: 18, fontWeight: '700' },
  conteudo: { padding: 16, gap: 16, paddingBottom: 32 },
  centralizado: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  botaoTexto: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  cartao: { borderRadius: 20, padding: 16, overflow: 'hidden' },
  cartaoTituloLinha: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cartaoTitulo: { fontSize: 16, fontWeight: '700' },
  aviso: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  avisoTexto: { flex: 1, fontSize: 15, lineHeight: 22 },
  botaoHistorico: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  avisoPrivacidade: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
});
