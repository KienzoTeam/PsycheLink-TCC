import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import CustomButton from '../../../components/ui/CustomButton';
import ToqueAnimado from '../../../components/ui/ToqueAnimado';
import {
  buscarConsentimento,
  buscarVinculo,
  encerrarVinculo,
  mensagemDeErro,
  salvarConsentimento,
  type Consentimento as ConsentimentoSalvo,
  type Escolhas,
  type Vinculo,
} from '../../../lib/vinculoService';
import { styles } from './styleConsentimento';

type Props = NativeStackScreenProps<RootStackParamList, 'Consentimento'>;

type Categoria = { chave: keyof Escolhas; rotulo: string; descricao: string };

const CATEGORIAS: Categoria[] = [
  {
    chave: 'humor',
    rotulo: 'Humor e emoções',
    descricao: 'Como você se sente e o nível de ansiedade nos check-ins. Se desligar, seu psicólogo deixa de ver seus check-ins.',
  },
  {
    chave: 'habitos',
    rotulo: 'Hábitos e sono',
    descricao: 'Horas e qualidade do sono, exercício e outros hábitos que você marca.',
  },
  {
    chave: 'escalas',
    rotulo: 'Escalas',
    descricao: 'Suas respostas às escalas e questionários de acompanhamento.',
  },
];

const DIARIO: Categoria = {
  chave: 'diario',
  rotulo: 'Diário (texto livre)',
  descricao: 'Notas em texto livre que você escreve nos check-ins. Por padrão fica desligado.',
};

const SEM_ESCOLHAS: Escolhas = { humor: false, habitos: false, escalas: false, diario: false };

const formatarData = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

const formatarDataHora = (iso: string) => {
  const data = new Date(iso);
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${data.toLocaleDateString('pt-BR')} às ${hora}`;
};

export default function Consentimento({ navigation }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [vinculo, setVinculo] = useState<Vinculo | null>(null);
  const [consentimento, setConsentimento] = useState<ConsentimentoSalvo | null>(null);
  const [escolhas, setEscolhas] = useState<Escolhas>(SEM_ESCOLHAS);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; texto: string } | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);

    try {
      const [vinculoAtual, salvo] = await Promise.all([buscarVinculo(), buscarConsentimento()]);

      if (!vinculoAtual) {
        navigation.replace('Vinculacao');
        return;
      }

      setVinculo(vinculoAtual);
      setConsentimento(salvo);
      setEscolhas(salvo);
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível carregar suas escolhas agora. Verifique sua conexão.'));
    }
  }, [navigation]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const alternar = (chave: keyof Escolhas) => {
    setEscolhas((atual) => ({ ...atual, [chave]: !atual[chave] }));
    setFeedback(null);
  };

  const salvar = async () => {
    setSalvando(true);
    setFeedback(null);

    try {
      const gravado = await salvarConsentimento(escolhas);
      setConsentimento(gravado);
      setEscolhas(gravado);
      setFeedback({ ok: true, texto: 'Escolhas salvas. Seu psicólogo já vê só o que está ligado.' });
    } catch (e) {
      setFeedback({ ok: false, texto: mensagemDeErro(e, 'Não foi possível salvar agora. Tente de novo.') });
    } finally {
      setSalvando(false);
    }
  };

  const encerrar = async () => {
    setEncerrando(true);

    try {
      await encerrarVinculo();
      Alert.alert('Vínculo encerrado', 'Seu psicólogo não tem mais acesso aos seus dados.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Não foi possível encerrar', mensagemDeErro(e, 'Tente de novo em instantes.'));
      setEncerrando(false);
    }
  };

  const confirmarEncerramento = () => {
    if (!vinculo) return;

    Alert.alert(
      'Encerrar vínculo?',
      `${vinculo.psicologo.nome} deixa de ver seus dados imediatamente. Seus check-ins continuam com você. Para voltar a compartilhar, você precisa de um novo código.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Encerrar vínculo', style: 'destructive', onPress: () => void encerrar() },
      ],
    );
  };

  const alterado =
    consentimento !== null && [...CATEGORIAS, DIARIO].some(({ chave }) => escolhas[chave] !== consentimento[chave]);

  const estiloCartao = {
    backgroundColor: theme.colors.surfaceContainer,
    borderColor: theme.colors.outline,
    borderRadius: theme.borderRadius.lg,
  };

  // O Switch é o controle; os textos ficam fora da árvore de acessibilidade porque rótulo e dica já vão nele.
  const renderLinha = ({ chave, rotulo, descricao }: Categoria) => (
    <View style={styles.linha}>
      <View style={styles.linhaTextos} aria-hidden>
        <Text style={[styles.rotulo, { color: theme.colors.onSurface }]} maxFontSizeMultiplier={1.4}>
          {rotulo}
        </Text>
        <Text style={[styles.descricao, { color: theme.colors.onSurfaceVariant }]} maxFontSizeMultiplier={1.4}>
          {descricao}
        </Text>
      </View>
      <Switch
        value={escolhas[chave]}
        onValueChange={() => alternar(chave)}
        trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primary }}
        ios_backgroundColor={theme.colors.surfaceVariant}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel={rotulo}
        accessibilityHint={descricao}
        accessibilityState={{ checked: escolhas[chave] }}
      />
    </View>
  );

  return (
    <View style={[styles.tela, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View style={styles.cabecalho}>
        <TouchableOpacity
          style={styles.botaoVoltar}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Feather name="arrow-left" size={22} color={theme.colors.onBackground} />
        </TouchableOpacity>

        <Text
          style={[styles.tituloCabecalho, { color: theme.colors.onBackground }]}
          accessibilityRole="header"
          maxFontSizeMultiplier={1.3}
        >
          Psicólogo e privacidade
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.conteudo, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
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
        ) : !vinculo || !consentimento ? (
          <View style={styles.centralizado} accessibilityRole="progressbar" accessibilityLabel="Carregando suas escolhas">
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={[styles.textoCentral, { color: theme.colors.onBackground }]}>Carregando suas escolhas...</Text>
          </View>
        ) : (
          <>
            <View style={[styles.cartao, estiloCartao]}>
              <View style={styles.psicologo}>
                <View style={[styles.psicologoIcone, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Feather name="user-check" size={22} color={theme.colors.onPrimaryContainer} />
                </View>
                <View style={styles.psicologoTextos}>
                  <Text style={[styles.psicologoNome, { color: theme.colors.onSurface }]} maxFontSizeMultiplier={1.3}>
                    {vinculo.psicologo.nome}
                  </Text>
                  <Text style={[styles.detalhe, { color: theme.colors.onSurfaceVariant }]} maxFontSizeMultiplier={1.4}>
                    CRP {vinculo.psicologo.crp}
                  </Text>
                  <Text style={[styles.detalhe, { color: theme.colors.onSurfaceVariant }]} maxFontSizeMultiplier={1.4}>
                    Vinculado desde {formatarData(vinculo.desde)}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={[styles.introducao, { color: theme.colors.onBackground }]} maxFontSizeMultiplier={1.4}>
              Você decide o que seu psicólogo pode ver. Pode mudar isso a qualquer momento: vale assim que você salvar.
            </Text>

            <View style={[styles.cartao, estiloCartao]}>
              {CATEGORIAS.map((categoria, indice) => (
                <React.Fragment key={categoria.chave}>
                  {indice > 0 && <View style={[styles.divisor, { backgroundColor: theme.colors.outline }]} />}
                  {renderLinha(categoria)}
                </React.Fragment>
              ))}
            </View>

            <View style={[styles.cartao, estiloCartao, { borderColor: theme.colors.primary, borderWidth: 1.5 }]}>
              {renderLinha(DIARIO)}
              <Text style={[styles.estadoDiario, { color: theme.colors.onSurface }]} maxFontSizeMultiplier={1.4}>
                {escolhas.diario
                  ? 'Ligado: seu psicólogo lê as notas dos seus check-ins.'
                  : 'Desligado: seu psicólogo não vê o que você escreve.'}
              </Text>
            </View>

            {consentimento.atualizadoEm && (
              <Text style={[styles.atualizadoEm, { color: theme.colors.subtext1 }]} maxFontSizeMultiplier={1.4}>
                Atualizado em {formatarDataHora(consentimento.atualizadoEm)}
              </Text>
            )}

            <CustomButton
              title="Salvar escolhas"
              onPress={() => void salvar()}
              loading={salvando}
              disabled={!alterado}
            />

            {feedback && (
              <View style={styles.feedback} accessibilityRole="alert">
                <Feather
                  name={feedback.ok ? 'check-circle' : 'alert-circle'}
                  size={18}
                  color={feedback.ok ? theme.colors.tertiary : theme.colors.error}
                />
                <Text
                  style={[styles.feedbackTexto, { color: feedback.ok ? theme.colors.onBackground : theme.colors.error }]}
                  maxFontSizeMultiplier={1.4}
                >
                  {feedback.texto}
                </Text>
              </View>
            )}

            <ToqueAnimado
              style={[styles.encerrar, { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.error }]}
              onPress={confirmarEncerramento}
              disabled={encerrando}
              accessibilityRole="button"
              accessibilityLabel="Encerrar vínculo"
              accessibilityState={{ disabled: encerrando }}
            >
              <Feather name="user-x" size={18} color={theme.colors.error} />
              <Text style={[styles.encerrarTexto, { color: theme.colors.error }]} maxFontSizeMultiplier={1.4}>
                Encerrar vínculo
              </Text>
            </ToqueAnimado>
          </>
        )}
      </ScrollView>
    </View>
  );
}
