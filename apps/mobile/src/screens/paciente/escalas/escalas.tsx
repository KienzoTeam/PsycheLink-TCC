import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../../theme/ThemeContext';
import type { RootStackParamList } from '../../../navigation/AppNavigator';
import { buscarEscalasPendentes, EscalaPendente, mensagemDeErro } from '../../../lib/escalasService';

export default function Escalas({ ativa }: { ativa: boolean }) {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [escalas, setEscalas] = useState<EscalaPendente[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      setEscalas(await buscarEscalasPendentes());
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível carregar suas escalas agora. Verifique sua conexão.'));
    }
  }, []);

  // O pager mantém todas as abas montadas: recarrega ao abrir a aba e ao voltar de uma escala.
  useFocusEffect(
    useCallback(() => {
      if (ativa) void carregar();
    }, [ativa, carregar]),
  );

  const puxarParaAtualizar = async () => {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  };

  const cartao = { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outline };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.conteudo}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => void puxarParaAtualizar()}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <View style={[styles.headerIconBox, { backgroundColor: theme.colors.primaryContainer }]}>
            <Feather name="clipboard" size={22} color={theme.colors.onPrimaryContainer} />
          </View>
          <View style={styles.headerTextos}>
            <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]} accessibilityRole="header">
              Escalas
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.subtext1 }]}>
              Questionários que seu psicólogo pede durante o acompanhamento. Não há resposta certa ou errada.
            </Text>
          </View>
        </View>

        {erro ? (
          <View style={styles.centralizado}>
            <Text style={[styles.textoCentral, { color: theme.colors.onBackground }]}>{erro}</Text>
            <TouchableOpacity
              style={styles.botaoTentarDeNovo}
              onPress={() => void carregar()}
              accessibilityRole="button"
              accessibilityLabel="Tentar de novo"
            >
              <Text style={[styles.textoTentarDeNovo, { color: theme.colors.primary }]}>Tentar de novo</Text>
            </TouchableOpacity>
          </View>
        ) : escalas === null ? (
          <View style={styles.centralizado}>
            <ActivityIndicator color={theme.colors.primary} accessibilityLabel="Carregando suas escalas" />
            <Text style={[styles.textoCentral, { color: theme.colors.onBackground }]}>Carregando suas escalas...</Text>
          </View>
        ) : escalas.length === 0 ? (
          <View style={[styles.vazio, cartao]}>
            <View style={[styles.vazioIcone, { backgroundColor: theme.colors.primaryContainer }]}>
              <Feather name="inbox" size={32} color={theme.colors.onPrimaryContainer} />
            </View>
            <Text style={[styles.vazioTitulo, { color: theme.colors.onBackground }]}>Nenhuma escala pendente.</Text>
            <Text style={[styles.textoCentral, { color: theme.colors.onSurfaceVariant }]}>
              Quando seu psicólogo pedir, ela aparece aqui.
            </Text>
          </View>
        ) : (
          <View style={styles.lista}>
            {escalas.map((escala) => (
              <TouchableOpacity
                key={escala.aplicacaoId}
                style={[styles.item, cartao]}
                onPress={() => navigation.navigate('ResponderEscala', { aplicacaoId: escala.aplicacaoId })}
                accessibilityRole="button"
                accessibilityHint="Abre as perguntas"
              >
                <View style={styles.itemTextos}>
                  <Text style={[styles.itemNome, { color: theme.colors.onSurface }]}>{escala.nome}</Text>
                  <Text style={[styles.itemDetalhe, { color: theme.colors.onSurfaceVariant }]}>
                    Pedida por {escala.psicologo.nome}
                  </Text>
                  <Text style={[styles.itemDetalhe, { color: theme.colors.onSurfaceVariant }]}>
                    {escala.sigla} · desde {new Date(escala.solicitadoEm).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  conteudo: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    gap: 14,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'flex-start',
  },
  headerIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTextos: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  centralizado: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  textoCentral: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  botaoTentarDeNovo: {
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  textoTentarDeNovo: {
    fontSize: 15,
    fontWeight: '600',
  },
  vazio: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  vazioIcone: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  vazioTitulo: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  lista: {
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 72,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemTextos: {
    flex: 1,
    gap: 4,
  },
  itemNome: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  itemDetalhe: {
    fontSize: 14,
    lineHeight: 20,
  },
});
