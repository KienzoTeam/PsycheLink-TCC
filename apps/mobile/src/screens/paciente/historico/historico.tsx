import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { buscarHistorico, Habitos, RegistroHistorico } from '../../../lib/checkinService';
import { rotularEmocao } from '../../../lib/emocoes';
import { vibrarLeve } from '../../../lib/hapticos';
import FiltroPeriodo, { Periodo } from '../../../components/ui/FiltroPeriodo';

type Props = NativeStackScreenProps<RootStackParamList, 'Historico'>;

const HABITOS: Record<keyof Habitos, string> = {
  hidratacao: 'Hidratação',
  exercicio: 'Exercício',
  meditacao: 'Meditação',
  limiteTelas: 'Limite de telas',
  contatoSocial: 'Contato social',
  medicacao: 'Medicação',
};

const dataLonga = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

export default function Historico({ navigation }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [dias, setDias] = useState<Periodo>(30);
  const [registros, setRegistros] = useState<RegistroHistorico[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    setRegistros(null);
    setErro(null);
    try {
      setRegistros((await buscarHistorico(dias)).registros);
    } catch (e: any) {
      setErro(e.response?.data?.error || 'Não foi possível carregar seu histórico agora.');
    }
  }, [dias]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const metrica = (rotulo: string, valor: string | null) =>
    valor === null ? null : (
      <View style={estilos.metrica}>
        <Text style={[estilos.metricaValor, { color: theme.colors.onSurface }]}>{valor}</Text>
        <Text style={[estilos.metricaRotulo, { color: theme.colors.onSurfaceVariant }]}>{rotulo}</Text>
      </View>
    );

  const secao = (titulo: string, texto: string) => (
    <View style={estilos.secao}>
      <Text style={[estilos.secaoTitulo, { color: theme.colors.onSurfaceVariant }]}>{titulo}</Text>
      <Text style={[estilos.secaoTexto, { color: theme.colors.onSurface }]}>{texto}</Text>
    </View>
  );

  const renderItem = ({ item: r }: { item: RegistroHistorico }) => {
    const expandido = aberto === r.id;
    const habitos = r.habitos ? (Object.keys(HABITOS) as (keyof Habitos)[]).filter((h) => r.habitos![h]) : [];
    return (
      <TouchableOpacity
        style={[
          estilos.cartao,
          { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outlineVariant },
        ]}
        onPress={() => {
          vibrarLeve();
          setAberto(expandido ? null : r.id);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: expandido }}
        accessibilityHint={expandido ? 'Esconde os detalhes' : 'Mostra os detalhes deste dia'}
      >
        <View style={estilos.topo}>
          <Text style={[estilos.data, { color: theme.colors.onSurface }]}>{dataLonga(r.data)}</Text>
          {r.horario && <Text style={{ color: theme.colors.onSurfaceVariant }}>{r.horario}</Text>}
          <Feather name={expandido ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.onSurfaceVariant} />
        </View>

        {!!r.emocoes?.length && (
          <View style={estilos.chips}>
            {r.emocoes.map((e) => (
              <View key={e} style={[estilos.chip, { backgroundColor: theme.colors.secondaryContainer }]}>
                <Text style={{ color: theme.colors.onSecondaryContainer, fontSize: 13 }}>{rotularEmocao(e)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={estilos.metricas}>
          {metrica('humor', r.humor === null ? null : `${r.humor}/10`)}
          {metrica('ansiedade', r.ansiedade === null ? null : `${r.ansiedade}/10`)}
          {metrica('sono', r.sonoHoras === null ? null : `${r.sonoHoras} h`)}
        </View>

        {expandido && (
          <View style={[estilos.detalhes, { borderTopColor: theme.colors.outlineVariant }]}>
            {r.qualidadeSono && secao('Qualidade do sono', r.qualidadeSono)}
            {!!r.gatilhos?.length && secao('Contexto do dia', r.gatilhos.join(', '))}
            {secao('Hábitos', habitos.length ? habitos.map((h) => HABITOS[h]).join(', ') : 'Nenhum marcado')}
            {r.notas && (
              <View style={estilos.secao}>
                <Text style={[estilos.secaoTitulo, { color: theme.colors.onSurfaceVariant }]}>Diário</Text>
                <Text style={[estilos.secaoTexto, { color: theme.colors.onSurface }]}>{r.notas}</Text>
                <View style={estilos.privacidade}>
                  <Feather name={r.diarioCompartilhado ? 'eye' : 'lock'} size={14} color={theme.colors.onSurfaceVariant} />
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>
                    {r.diarioCompartilhado ? 'Compartilhado com seu psicólogo' : 'Só você vê este texto'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[estilos.tela, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View style={estilos.cabecalho}>
        <TouchableOpacity
          style={estilos.voltar}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Feather name="arrow-left" size={22} color={theme.colors.onBackground} />
        </TouchableOpacity>
        <Text style={[estilos.titulo, { color: theme.colors.onBackground }]} accessibilityRole="header">
          Histórico
        </Text>
      </View>

      <FlatList
        data={registros ?? []}
        keyExtractor={(r) => String(r.id)}
        renderItem={renderItem}
        contentContainerStyle={[estilos.lista, { paddingBottom: insets.bottom + 32 }]}
        ListHeaderComponent={<FiltroPeriodo valor={dias} aoMudar={setDias} />}
        ListEmptyComponent={
          erro ? (
            <View style={estilos.centro}>
              <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>{erro}</Text>
              <TouchableOpacity onPress={carregar} style={estilos.botaoTexto} accessibilityRole="button">
                <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Tentar de novo</Text>
              </TouchableOpacity>
            </View>
          ) : registros === null ? (
            <View style={estilos.centro} accessibilityRole="progressbar" accessibilityLabel="Carregando histórico">
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : (
            <View style={estilos.centro}>
              <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                Nenhum check-in neste período.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8 },
  voltar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1, fontSize: 20, fontWeight: '700' },
  lista: { padding: 16, gap: 12 },
  centro: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  botaoTexto: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  cartao: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 12 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  data: { flex: 1, fontSize: 16, fontWeight: '600', textTransform: 'capitalize' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  metricas: { flexDirection: 'row', gap: 24 },
  metrica: { gap: 2 },
  metricaValor: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  metricaRotulo: { fontSize: 12 },
  detalhes: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 12 },
  secao: { gap: 4 },
  secaoTitulo: { fontSize: 12, fontWeight: '600' },
  secaoTexto: { fontSize: 15, lineHeight: 22 },
  privacidade: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
});
