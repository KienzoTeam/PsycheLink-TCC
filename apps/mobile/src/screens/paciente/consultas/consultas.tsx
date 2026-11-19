import React, { useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import CustomButton from '../../../components/ui/CustomButton';
import { useConsultas } from '../../../hooks/useConsultas';
import { Consulta, formatarConsulta } from '../../../lib/consultasService';

const STATUS = {
  agendada: { rotulo: 'Agendada', icone: 'calendar' },
  concluida: { rotulo: 'Concluída', icone: 'check-circle' },
  cancelada: { rotulo: 'Cancelada', icone: 'x-circle' },
} as const;

function ItemConsulta({ consulta }: { consulta: Consulta }) {
  const { theme } = useTheme();
  const { data, horario } = formatarConsulta(consulta);
  const { rotulo, icone } = STATUS[consulta.status];
  const nome = consulta.psicologo.nome;
  // Cancelada fica neutra: o vermelho de erro é reservado para falhas e SOS.
  const corIcone = {
    agendada: theme.colors.primary,
    concluida: theme.colors.tertiary,
    cancelada: theme.colors.onSurfaceVariant,
  }[consulta.status];

  return (
    <View
      accessible
      accessibilityLabel={`Consulta em ${data}, das ${horario}, com ${nome}, ${rotulo.toLowerCase()}`}
      style={[
        estilos.item,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
          borderRadius: theme.borderRadius.lg,
        },
      ]}
    >
      <Text style={[estilos.data, { color: theme.colors.onSurface }]}>{data}</Text>
      <Text style={[estilos.detalhe, { color: theme.colors.subtext1 }]}>{horario}</Text>
      <Text style={[estilos.detalhe, { color: theme.colors.subtext1 }]}>com {nome}</Text>
      <View style={estilos.status}>
        <Feather name={icone} size={16} color={corIcone} />
        <Text style={[estilos.statusTexto, { color: theme.colors.subtext1 }]}>{rotulo}</Text>
      </View>
    </View>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, 'Consultas'>;

export default function Consultas({ navigation }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { dados, erro, carregar } = useConsultas();
  const [atualizando, setAtualizando] = useState(false);

  const carregando = !dados && !erro;
  const semConsultas =
    !erro && dados !== null && dados.proximas.length === 0 && dados.passadas.length === 0;
  const secoes =
    !erro && dados && !semConsultas
      ? [
          { titulo: 'Próximas', data: dados.proximas },
          ...(dados.passadas.length > 0 ? [{ titulo: 'Anteriores', data: dados.passadas }] : []),
        ]
      : [];

  const atualizar = async () => {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  };

  return (
    <View role="main" style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top }}>
      <View style={estilos.cabecalho}>
        <TouchableOpacity
          style={estilos.voltar}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Feather name="arrow-left" size={22} color={theme.colors.onBackground} />
        </TouchableOpacity>
        <Text
          style={[estilos.titulo, { color: theme.colors.onBackground }]}
          accessibilityRole="header"
          maxFontSizeMultiplier={1.4}
        >
          Minhas consultas
        </Text>
        <View style={estilos.voltar} />
      </View>

      <SectionList
        sections={secoes}
        keyExtractor={(consulta) => String(consulta.id)}
        renderItem={({ item }) => <ItemConsulta consulta={item} />}
        renderSectionHeader={({ section }) => (
          <Text
            style={[estilos.secao, { color: theme.colors.onBackground }]}
            accessibilityRole="header"
          >
            {section.titulo}
          </Text>
        )}
        renderSectionFooter={({ section }) =>
          section.data.length === 0 ? (
            <Text style={[estilos.detalhe, estilos.semAgendada, { color: theme.colors.subtext1 }]}>
              Nenhuma consulta agendada.
            </Text>
          ) : null
        }
        stickySectionHeadersEnabled={false}
        tabIndex={0}
        ListEmptyComponent={
          <View style={estilos.centralizado}>
            {carregando && (
              <>
                <ActivityIndicator color={theme.colors.primary} />
                <Text style={[estilos.detalhe, { color: theme.colors.subtext1 }]}>
                  Carregando consultas...
                </Text>
              </>
            )}
            {erro && (
              <>
                <Text style={[estilos.detalhe, estilos.centro, { color: theme.colors.subtext1 }]}>
                  Não foi possível carregar suas consultas agora. Verifique sua conexão.
                </Text>
                <CustomButton title="Tentar de novo" onPress={carregar} />
              </>
            )}
            {semConsultas && (
              <Text style={[estilos.detalhe, estilos.centro, { color: theme.colors.subtext1 }]}>
                Nenhuma consulta por aqui ainda. Quando o seu psicólogo marcar uma, ela aparece
                nesta lista.
              </Text>
            )}
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={atualizar}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        contentContainerStyle={estilos.conteudo}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  voltar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: {
    fontSize: 18,
    fontWeight: '700',
  },
  conteudo: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  secao: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 12,
  },
  item: {
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 4,
  },
  data: {
    fontSize: 16,
    fontWeight: '700',
  },
  detalhe: {
    fontSize: 14,
    lineHeight: 20,
  },
  semAgendada: {
    marginBottom: 12,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  statusTexto: {
    fontSize: 13,
    fontWeight: '600',
  },
  centralizado: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  centro: {
    textAlign: 'center',
  },
});
