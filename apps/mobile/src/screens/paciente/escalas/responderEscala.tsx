import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../../theme/ThemeContext';
import type { RootStackParamList } from '../../../navigation/AppNavigator';
import CustomButton from '../../../components/ui/CustomButton';
import { vibrarLeve } from '../../../lib/hapticos';
import { Aplicacao, buscarAplicacao, enviarRespostas, escalasCompartilhadas, mensagemDeErro } from '../../../lib/escalasService';

type Props = NativeStackScreenProps<RootStackParamList, 'ResponderEscala'>;

const ITEM_9_PHQ_9 = 8;

export default function ResponderEscala({ navigation, route }: Props) {
  const { aplicacaoId } = route.params;
  const { theme } = useTheme();
  const [aplicacao, setAplicacao] = useState<Aplicacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [respostas, setRespostas] = useState<(number | null)[]>([]);
  const [indice, setIndice] = useState(0);
  const [revisando, setRevisando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [compartilha, setCompartilha] = useState(false);
  const rolagem = useRef<ScrollView>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const dados = await buscarAplicacao(aplicacaoId);
      setAplicacao(dados);
      setRespostas(dados.itens.map(() => null));
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível abrir a escala agora. Verifique sua conexão.'));
    }
  }, [aplicacaoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Pergunta, revisão e conclusão dividem a mesma rolagem: cada troca começa do topo.
  useEffect(() => {
    rolagem.current?.scrollTo({ y: 0, animated: false });
  }, [indice, revisando, enviado]);

  const sair = () => {
    if (enviado || respostas.every((r) => r === null)) {
      navigation.goBack();
      return;
    }
    Alert.alert('Sair sem enviar?', 'Suas respostas ainda não foram enviadas e serão descartadas.', [
      { text: 'Continuar respondendo', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  const escolher = (valor: number) => {
    vibrarLeve();
    setRespostas((atual) => atual.map((r, i) => (i === indice ? valor : r)));
  };

  const enviar = async () => {
    if (enviando || !aplicacao) return;
    setEnviando(true);
    setErroEnvio(null);
    try {
      await enviarRespostas(
        aplicacao.aplicacaoId,
        respostas.filter((r): r is number => r !== null),
      );
      setEnviado(true);
      // A conclusão (e o apoio do PHQ-9) aparece já com o aviso conservador; a preferência só ajusta o texto.
      void escalasCompartilhadas().then(setCompartilha);
    } catch (e) {
      setErroEnvio(mensagemDeErro(e, 'Não foi possível enviar agora. Verifique sua conexão e tente de novo.'));
    } finally {
      setEnviando(false);
    }
  };

  const ligar = async (numero: string) => {
    try {
      await Linking.openURL(`tel:${numero}`);
    } catch {
      Alert.alert('Não foi possível ligar', `Disque ${numero} no seu telefone.`);
    }
  };

  const cartao = { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outline };

  const renderItem = (escala: Aplicacao) => {
    const total = escala.itens.length;
    const atual = respostas[indice];
    const ultimo = indice === total - 1;

    return (
      <>
        <Text style={[styles.progresso, { color: theme.colors.subtext1 }]}>
          Item {indice + 1} de {total}
        </Text>
        <View style={[styles.barra, { backgroundColor: theme.colors.surfaceVariant }]} aria-hidden>
          <View
            style={[styles.barraPreenchida, { width: `${((indice + 1) / total) * 100}%`, backgroundColor: theme.colors.primary }]}
          />
        </View>
        <Text style={[styles.instrucao, { color: theme.colors.subtext1 }]}>{escala.instrucao}</Text>
        <Text style={[styles.pergunta, { color: theme.colors.onBackground }]} accessibilityRole="header">
          {escala.itens[indice]}
        </Text>

        <View style={styles.opcoes} accessibilityRole="radiogroup" accessibilityLabel={escala.itens[indice]}>
          {escala.opcoes.map((opcao) => {
            const marcada = atual === opcao.valor;
            return (
              <TouchableOpacity
                key={opcao.valor}
                style={[
                  styles.opcao,
                  cartao,
                  marcada && { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryContainer },
                ]}
                onPress={() => escolher(opcao.valor)}
                accessibilityRole="radio"
                accessibilityState={{ checked: marcada }}
                // react-native-web não lê accessibilityState.
                aria-checked={marcada}
                accessibilityLabel={opcao.rotulo}
              >
                <View style={[styles.radio, { borderColor: marcada ? theme.colors.primary : theme.colors.onSurfaceVariant }]}>
                  {marcada && <View style={[styles.radioMiolo, { backgroundColor: theme.colors.primary }]} />}
                </View>
                <Text
                  style={[styles.opcaoRotulo, { color: marcada ? theme.colors.onPrimaryContainer : theme.colors.onSurface }]}
                >
                  {opcao.rotulo}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.rodape}>
          {indice > 0 && !editando && (
            <TouchableOpacity
              style={[styles.botaoVoltar, { borderColor: theme.colors.outline }]}
              onPress={() => setIndice(indice - 1)}
              accessibilityRole="button"
            >
              <Text style={[styles.botaoVoltarTexto, { color: theme.colors.onBackground }]}>Voltar</Text>
            </TouchableOpacity>
          )}
          <View style={styles.rodapeAvancar}>
            <CustomButton
              title={editando ? 'Voltar à revisão' : ultimo ? 'Revisar respostas' : 'Próximo'}
              disabled={atual === null}
              onPress={() => {
                if (editando || ultimo) {
                  setEditando(false);
                  setRevisando(true);
                } else {
                  setIndice(indice + 1);
                }
              }}
            />
          </View>
        </View>
      </>
    );
  };

  const renderRevisao = (escala: Aplicacao) => (
    <>
      <Text style={[styles.pergunta, { color: theme.colors.onBackground }]} accessibilityRole="header">
        Revise suas respostas
      </Text>
      <Text style={[styles.instrucao, { color: theme.colors.subtext1 }]}>
        Toque em um item para mudar a resposta. Depois, envie ao seu psicólogo.
      </Text>

      <View style={[styles.revisao, cartao]}>
        {escala.itens.map((item, i) => {
          const rotulo = escala.opcoes.find((o) => o.valor === respostas[i])?.rotulo;
          return (
            <TouchableOpacity
              key={i}
              style={[styles.linhaRevisao, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.outline }]}
              onPress={() => {
                setIndice(i);
                setEditando(true);
                setRevisando(false);
              }}
              disabled={enviando}
              accessibilityRole="button"
              accessibilityState={{ disabled: enviando }}
              accessibilityLabel={`Item ${i + 1}: ${item}. Resposta: ${rotulo}.`}
              accessibilityHint="Muda a resposta"
            >
              <View style={styles.linhaRevisaoTextos}>
                <Text style={[styles.revisaoItem, { color: theme.colors.onSurfaceVariant }]}>
                  {i + 1}. {item}
                </Text>
                <Text style={[styles.revisaoResposta, { color: theme.colors.onSurface }]}>{rotulo}</Text>
              </View>
              <Feather name="edit-2" size={16} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          );
        })}
      </View>

      {erroEnvio && (
        <View style={styles.erroEnvio} accessibilityRole="alert">
          <Feather name="alert-circle" size={18} color={theme.colors.error} />
          <Text style={[styles.erroEnvioTexto, { color: theme.colors.error }]}>{erroEnvio}</Text>
        </View>
      )}

      <View style={styles.rodape}>
        <TouchableOpacity
          style={[styles.botaoVoltar, { borderColor: theme.colors.outline }]}
          onPress={() => setRevisando(false)}
          disabled={enviando}
          accessibilityRole="button"
        >
          <Text style={[styles.botaoVoltarTexto, { color: theme.colors.onBackground }]}>Voltar</Text>
        </TouchableOpacity>
        <View style={styles.rodapeAvancar}>
          <CustomButton title="Enviar ao psicólogo" loading={enviando} onPress={() => void enviar()} />
        </View>
      </View>
    </>
  );

  const renderConclusao = () => {
    const precisaApoio = aplicacao?.sigla === 'PHQ-9' && respostas[ITEM_9_PHQ_9] !== 0;
    const avisoPsicologo = compartilha
      ? 'Seu psicólogo vai ver suas respostas.'
      : 'Seu psicólogo só vê as respostas enquanto o compartilhamento de escalas estiver ligado.';
    const acoes = [
      { titulo: 'Ligar para o CVV, 188', detalhe: 'Apoio emocional, 24 horas, gratuito.', icone: 'phone', aoTocar: () => void ligar('188') },
      { titulo: 'Ligar para o SAMU, 192', detalhe: 'Em caso de emergência.', icone: 'phone', aoTocar: () => void ligar('192') },
      {
        titulo: 'Abrir a tela SOS',
        detalhe: 'Respiração guiada e contatos de confiança.',
        icone: 'life-buoy',
        aoTocar: () => navigation.popTo('Main', { aba: 'SOS' }),
      },
    ] as const;

    return (
      <View style={styles.conclusao}>
        <View style={[styles.conclusaoIcone, { backgroundColor: theme.colors.primaryContainer }]}>
          <Feather name="check" size={36} color={theme.colors.onPrimaryContainer} />
        </View>
        <Text style={[styles.conclusaoTitulo, { color: theme.colors.onBackground }]} accessibilityRole="header">
          {compartilha ? 'Respostas enviadas ao seu psicólogo.' : 'Respostas registradas.'}
        </Text>

        {precisaApoio ? (
          <>
            <Text style={[styles.conclusaoTexto, { color: theme.colors.onBackground }]}>
              Pelo que você respondeu, parece que está sendo um período difícil. Obrigado por contar como você está.{' '}
              {avisoPsicologo}
            </Text>
            <Text style={[styles.conclusaoTexto, { color: theme.colors.onBackground }]}>
              Se quiser conversar com alguém agora:
            </Text>
            <View style={styles.acoes}>
              {acoes.map((acao) => (
                <TouchableOpacity
                  key={acao.titulo}
                  style={[styles.acao, cartao]}
                  onPress={acao.aoTocar}
                  accessibilityRole="button"
                  accessibilityLabel={`${acao.titulo}. ${acao.detalhe}`}
                >
                  <View style={[styles.acaoIcone, { backgroundColor: theme.colors.primaryContainer }]}>
                    <Feather name={acao.icone} size={20} color={theme.colors.onPrimaryContainer} />
                  </View>
                  <View style={styles.acaoTextos}>
                    <Text style={[styles.acaoTitulo, { color: theme.colors.onSurface }]}>{acao.titulo}</Text>
                    <Text style={[styles.acaoDetalhe, { color: theme.colors.onSurfaceVariant }]}>{acao.detalhe}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <CustomButton title="Voltar ao início" variant="outline" onPress={() => navigation.popTo('Main', { aba: 'Home' })} />
          </>
        ) : (
          <>
            {!compartilha && (
              <Text style={[styles.conclusaoTexto, { color: theme.colors.onBackground }]}>{avisoPsicologo}</Text>
            )}
            <CustomButton title="Voltar às escalas" onPress={() => navigation.goBack()} />
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: theme.colors.background }]}>
      <View style={styles.cabecalho}>
        <TouchableOpacity
          style={styles.botaoSair}
          onPress={sair}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Feather name="arrow-left" size={22} color={theme.colors.onBackground} />
        </TouchableOpacity>
        <Text style={[styles.tituloCabecalho, { color: theme.colors.onBackground }]}>{aplicacao?.sigla ?? 'Escala'}</Text>
      </View>

      <ScrollView ref={rolagem} contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
        ) : !aplicacao ? (
          <View style={styles.centralizado}>
            <ActivityIndicator color={theme.colors.primary} accessibilityLabel="Carregando as perguntas" />
            <Text style={[styles.textoCentral, { color: theme.colors.onBackground }]}>Carregando as perguntas...</Text>
          </View>
        ) : enviado ? (
          renderConclusao()
        ) : revisando ? (
          renderRevisao(aplicacao)
        ) : (
          renderItem(aplicacao)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  botaoSair: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloCabecalho: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
  },
  conteudo: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
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
  progresso: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 8,
  },
  barra: {
    height: 6,
    borderRadius: 3,
    marginBottom: 20,
  },
  barraPreenchida: {
    height: 6,
    borderRadius: 3,
  },
  instrucao: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  pergunta: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    marginBottom: 20,
  },
  opcoes: {
    gap: 10,
  },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioMiolo: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  opcaoRotulo: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  rodape: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
  },
  rodapeAvancar: {
    flex: 1,
  },
  botaoVoltar: {
    paddingHorizontal: 28,
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botaoVoltarTexto: {
    fontSize: 16,
    fontWeight: '600',
  },
  revisao: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  linhaRevisao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  linhaRevisaoTextos: {
    flex: 1,
    gap: 4,
  },
  revisaoItem: {
    fontSize: 14,
    lineHeight: 20,
  },
  revisaoResposta: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  erroEnvio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  erroEnvioTexto: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  conclusao: {
    alignItems: 'center',
    paddingTop: 24,
    gap: 16,
  },
  conclusaoIcone: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conclusaoTitulo: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '700',
    textAlign: 'center',
  },
  conclusaoTexto: {
    alignSelf: 'stretch',
    fontSize: 16,
    lineHeight: 24,
  },
  acoes: {
    alignSelf: 'stretch',
    gap: 10,
  },
  acao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 68,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  acaoIcone: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acaoTextos: {
    flex: 1,
    gap: 2,
  },
  acaoTitulo: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  acaoDetalhe: {
    fontSize: 14,
    lineHeight: 20,
  },
});
