import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { useAuth } from '../../../hooks/useAuth';
import { styles as base } from '../consentimento/styleConsentimento';
import {
  carregarLembretes,
  formatarHora,
  lembretesSuportados,
  pedirPermissao,
  salvarLembretes,
  type Lembrete,
  type Lembretes,
  type TipoLembrete,
} from '../../../lib/lembretes';
import { avisosLigados, desligarAvisos, ligarAvisos, semPushNoExpoGo } from '../../../lib/pushPaciente';
import { mensagemDeErro } from '../../../lib/vinculoService';

type Props = NativeStackScreenProps<RootStackParamList, 'Notificacoes'>;

const ITENS: { tipo: TipoLembrete; rotulo: string; descricao: string }[] = [
  { tipo: 'manha', rotulo: 'Check-in da manhã', descricao: 'Todo dia, para registrar como você começa o dia.' },
  { tipo: 'noite', rotulo: 'Check-in da noite', descricao: 'Todo dia, caso ainda não tenha feito o de hoje.' },
  { tipo: 'semanal', rotulo: 'Resumo da semana', descricao: 'Toda segunda-feira, um convite para ver Meus Dados.' },
];

const DESCRICAO_AVISOS = semPushNoExpoGo
  ? 'No Expo Go do Android este aviso não chega. Use o aplicativo do PsycheLink instalado no celular.'
  : 'Avisa quando seu psicólogo pedir uma escala ou recomendar um exercício. Precisa de internet e do aplicativo instalado. O aviso não mostra nenhum detalhe.';

const PASSO = 15; // minutos

function mover({ hora, minuto }: Lembrete, delta: number) {
  const total = (hora * 60 + minuto + delta + 24 * 60) % (24 * 60);
  return { hora: Math.floor(total / 60), minuto: total % 60 };
}

export default function Notificacoes({ navigation }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { usuario } = useAuth();
  const [lembretes, setLembretes] = useState<Lembretes | null>(null);
  const [semPermissao, setSemPermissao] = useState(false);
  const [avisos, setAvisos] = useState<boolean | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erroAvisos, setErroAvisos] = useState<string | null>(null);

  useEffect(() => {
    void carregarLembretes().then(setLembretes);
  }, []);

  useEffect(() => {
    if (usuario) void avisosLigados(usuario.id).then(setAvisos);
  }, [usuario]);

  // Cada mudança vale na hora: sem botão de salvar numa tela de interruptores.
  const aplicar = async (novo: Lembretes, ligando: boolean) => {
    if (ligando && !(await pedirPermissao())) {
      setSemPermissao(true);
      return;
    }
    setSemPermissao(false);
    setLembretes(novo);
    await salvarLembretes({ ...novo, oferecido: true });
  };

  const alternar = (tipo: TipoLembrete) => {
    if (!lembretes) return;
    const ativo = !lembretes[tipo].ativo;
    void aplicar({ ...lembretes, [tipo]: { ...lembretes[tipo], ativo } }, ativo);
  };

  const ajustar = (tipo: TipoLembrete, delta: number) => {
    if (!lembretes) return;
    void aplicar({ ...lembretes, [tipo]: { ...lembretes[tipo], ...mover(lembretes[tipo], delta) } }, false);
  };

  // Ligar pede a permissão e registra o aparelho no servidor; desligar tira o registro de lá.
  const alternarAvisos = async () => {
    if (!usuario || ocupado) return;
    const ligando = !avisos;
    setOcupado(true);
    setErroAvisos(null);
    setSemPermissao(false);
    try {
      if (ligando) {
        if (await ligarAvisos(usuario.id)) setAvisos(true);
        else setSemPermissao(true);
      } else {
        await desligarAvisos();
        setAvisos(false);
      }
    } catch (erro) {
      setErroAvisos(
        mensagemDeErro(erro, `Não foi possível ${ligando ? 'ligar' : 'desligar'} os avisos agora. Confira a internet e tente de novo.`),
      );
    } finally {
      setOcupado(false);
    }
  };

  const cartao = {
    backgroundColor: theme.colors.surfaceContainer,
    borderColor: theme.colors.outlineVariant,
    borderRadius: theme.borderRadius.lg,
  };

  const botaoHora = (tipo: TipoLembrete, delta: number, rotulo: string) => (
    <TouchableOpacity
      style={[local.botaoHora, { backgroundColor: theme.colors.surfaceVariant }]}
      onPress={() => ajustar(tipo, delta)}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
    >
      <Feather name={delta < 0 ? 'minus' : 'plus'} size={18} color={theme.colors.onSurface} />
    </TouchableOpacity>
  );

  return (
    <View style={[base.tela, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View style={base.cabecalho}>
        <TouchableOpacity
          style={base.botaoVoltar}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Feather name="arrow-left" size={22} color={theme.colors.onBackground} />
        </TouchableOpacity>
        <Text style={[base.tituloCabecalho, { color: theme.colors.onBackground }]} accessibilityRole="header">
          Notificações
        </Text>
      </View>

      <ScrollView contentContainerStyle={[base.conteudo, { paddingBottom: insets.bottom + 40 }]}>
        {!lembretesSuportados ? (
          <Text style={[base.textoCentral, { color: theme.colors.onBackground }]}>
            Lembretes só funcionam no aplicativo para celular.
          </Text>
        ) : !lembretes ? (
          <View style={base.centralizado} accessibilityRole="progressbar" accessibilityLabel="Carregando lembretes">
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : (
          <>
            <Text style={[base.introducao, { color: theme.colors.onBackground }]} maxFontSizeMultiplier={1.4}>
              Os lembretes ficam no seu celular e funcionam mesmo sem internet. Nada sobre você vai no texto da
              notificação.
            </Text>

            {semPermissao && (
              <View
                style={[
                  local.aviso,
                  { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.error, borderRadius: theme.borderRadius.md },
                ]}
                accessibilityRole="alert"
              >
                <Text style={[base.descricao, { color: theme.colors.onSurface }]}>
                  O Android está bloqueando as notificações do PsycheLink. Libere nas configurações do celular.
                </Text>
                <TouchableOpacity onPress={() => void Linking.openSettings()} accessibilityRole="button" style={local.link}>
                  <Text style={[base.rotulo, { color: theme.colors.error, textDecorationLine: 'underline' }]}>
                    Abrir configurações
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={[base.cartao, cartao]}>
              {ITENS.map(({ tipo, rotulo, descricao }, indice) => {
                const item = lembretes[tipo];
                const hora = formatarHora(item);
                return (
                  <React.Fragment key={tipo}>
                    {indice > 0 && <View style={[base.divisor, { backgroundColor: theme.colors.outlineVariant }]} />}
                    <View style={base.linha}>
                      <View style={base.linhaTextos} aria-hidden>
                        <Text style={[base.rotulo, { color: theme.colors.onSurface }]} maxFontSizeMultiplier={1.4}>
                          {rotulo}
                        </Text>
                        <Text style={[base.descricao, { color: theme.colors.onSurfaceVariant }]} maxFontSizeMultiplier={1.4}>
                          {descricao}
                        </Text>
                      </View>
                      <Switch
                        value={item.ativo}
                        onValueChange={() => alternar(tipo)}
                        trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primary }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel={`${rotulo}, às ${hora}`}
                        accessibilityState={{ checked: item.ativo }}
                      />
                    </View>
                    {item.ativo && (
                      <View style={local.horario}>
                        {botaoHora(tipo, -PASSO, `${rotulo}: 15 minutos mais cedo`)}
                        <Text
                          style={[local.hora, { color: theme.colors.onSurface }]}
                          accessibilityLabel={`Horário: ${hora}`}
                          maxFontSizeMultiplier={1.3}
                        >
                          {hora}
                        </Text>
                        {botaoHora(tipo, PASSO, `${rotulo}: 15 minutos mais tarde`)}
                      </View>
                    )}
                  </React.Fragment>
                );
              })}
            </View>

            <View style={[base.cartao, cartao]}>
              <View style={base.linha}>
                <View style={base.linhaTextos} aria-hidden>
                  <Text style={[base.rotulo, { color: theme.colors.onSurface }]} maxFontSizeMultiplier={1.4}>
                    Avisos do seu psicólogo
                  </Text>
                  <Text style={[base.descricao, { color: theme.colors.onSurfaceVariant }]} maxFontSizeMultiplier={1.4}>
                    {DESCRICAO_AVISOS}
                  </Text>
                </View>
                <Switch
                  value={avisos === true}
                  onValueChange={() => void alternarAvisos()}
                  disabled={avisos === null || ocupado || semPushNoExpoGo}
                  trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primary }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Avisos do seu psicólogo"
                  accessibilityHint={DESCRICAO_AVISOS}
                  accessibilityState={{ checked: avisos === true, disabled: avisos === null || ocupado || semPushNoExpoGo }}
                />
              </View>
            </View>

            {erroAvisos && (
              <View
                style={[
                  local.aviso,
                  { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.error, borderRadius: theme.borderRadius.md },
                ]}
                accessibilityRole="alert"
              >
                <Text style={[base.descricao, { color: theme.colors.onSurface }]}>{erroAvisos}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const local = StyleSheet.create({
  horario: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  botaoHora: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hora: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    minWidth: 88,
    textAlign: 'center',
  },
  aviso: {
    borderWidth: 1.5,
    padding: 16,
    gap: 8,
  },
  link: {
    minHeight: 44,
    justifyContent: 'center',
  },
});
