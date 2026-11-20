import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../../theme/ThemeContext';
import { gradienteMarca } from '../../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../hooks/useAuth';
import SeloDemonstracao from '../../../components/ui/SeloDemonstracao';
import SheetConta from '../../../components/ui/SheetConta';
import ExercicioRespiracao from '../../../components/ui/ExercicioRespiracao';
import type { MainTabParamList } from '../../../navigation/MainTabNavigator';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { buscarPainelCheckin, PainelCheckin } from '../../../lib/checkinService';
import { formatarConsulta } from '../../../lib/consultasService';
import { rotularEmocao } from '../../../lib/emocoes';
import { useConsultas } from '../../../hooks/useConsultas';
import { buscarVinculo, type Vinculo } from '../../../lib/vinculoService';
import { styles } from './styleHome';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return { texto: 'Bom dia', emoji: '☀️' };
  if (hour < 18) return { texto: 'Boa tarde', emoji: '🌤️' };
  return { texto: 'Boa noite', emoji: '🌙' };
};

const EMOCOES_EXEMPLO = ['Calmo', 'Feliz', 'Ansioso', 'Energético', 'Cansado'];

function formatarTendencia(valor: number | null | undefined): string | null {
  if (valor === null || valor === undefined) return null;
  if (valor === 0) return '→ estável esta semana';
  const seta = valor > 0 ? '↑' : '↓';
  const sinal = valor > 0 ? '+' : '';
  return `${seta} ${sinal}${valor} esta semana`;
}

export default function Home() {
  const { theme, mode, setMode } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<
    CompositeNavigationProp<
      NativeStackNavigationProp<MainTabParamList>,
      NativeStackNavigationProp<RootStackParamList>
    >
  >();
  const { usuario, logout } = useAuth();
  const [sheetContaAberta, setSheetContaAberta] = useState(false);
  const [respirandoAberta, setRespirandoAberta] = useState(false);
  const [psicologo, setPsicologo] = useState<Vinculo['psicologo'] | null>(null);
  const [painel, setPainel] = useState<PainelCheckin | null>(null);
  const [carregandoPainel, setCarregandoPainel] = useState(true);
  const [erroPainel, setErroPainel] = useState(false);
  const [tentativaPainel, setTentativaPainel] = useState(0);

  // Recarrega toda vez que a Home ganha foco
  useFocusEffect(
    useCallback(() => {
      let telaAtiva = true;
      setCarregandoPainel(true);
      setErroPainel(false);

      buscarPainelCheckin()
        .then((dados) => {
          if (telaAtiva) setPainel(dados);
        })
        .catch((erro) => {
          // Erro de rede/servidor não é "sem dados": mantém o painel anterior
          // (se houver) e sinaliza a falha em vez de exibir números de exemplo.
          console.warn('Não foi possível carregar o painel da Home:', erro?.message);
          if (telaAtiva) setErroPainel(true);
        })
        .finally(() => {
          if (telaAtiva) setCarregandoPainel(false);
        });

      return () => {
        telaAtiva = false;
      };
    }, [tentativaPainel]),
  );

  const { dados: consultas, erro: erroConsultas } = useConsultas();
  // Cancelada ainda futura vem em `proximas`, mas não é a próxima consulta.
  const proxima = consultas?.proximas.find((c) => c.status === 'agendada');
  const proximaConsulta = proxima
    ? { ...formatarConsulta(proxima), nome: proxima.psicologo.nome }
    : null;

  const temDados = painel !== null && !painel.semDados;
  // Exemplo só após carregar, com sucesso e sem dados reais — nunca durante
  // o carregamento inicial nem após falha de rede.
  const mostrarExemplo = !carregandoPainel && !temDados && !erroPainel;

  // Parallax: o header sobe mais devagar que o conteúdo
  const scrollY = useSharedValue(0);
  const rolar = useAnimatedScrollHandler(e => {
    scrollY.value = e.contentOffset.y;
  });
  const estiloHeader = useAnimatedStyle(() => ({
    transform: [{ translateY: scrollY.value * 0.35 }],
  }));

  // Só atualiza o cartão de vínculo do sheet; se falhar, mantém o último valor conhecido.
  useEffect(() => {
    if (!sheetContaAberta) return;
    buscarVinculo()
      .then((vinculo) => setPsicologo(vinculo?.psicologo ?? null))
      .catch((erro) => console.warn('Não foi possível carregar o vínculo:', erro?.message));
  }, [sheetContaAberta]);

  const sairDaConta = async () => {
    setSheetContaAberta(false);
    await logout();
  };

  const nome = usuario?.nome?.trim() || 'Usuário';
  const { texto, emoji } = getGreeting();

  const humorMedioExibido = temDados ? (painel!.humorMedio ?? null) : mostrarExemplo ? 7.5 : null;
  const humorTendenciaExibida = temDados
    ? formatarTendencia(painel!.humorVariacaoSemana)
    : mostrarExemplo ? '↑ +0.8 esta semana' : null;

  const ansiedadeMediaExibida = temDados ? (painel!.ansiedadeMedia ?? null) : mostrarExemplo ? 4.2 : null;
  const ansiedadeTendenciaExibida = temDados
    ? formatarTendencia(painel!.ansiedadeVariacaoSemana)
    : mostrarExemplo ? '↓ -1.2 esta semana' : null;

  const sonoExibido = temDados
    ? painel!.sonoMedioHoras !== null && painel!.sonoMedioHoras !== undefined
      ? `${painel!.sonoMedioHoras}h`
      : '—'
    : mostrarExemplo ? '7.2h' : '—';
  const qualidadeSonoExibida = temDados
    ? painel!.qualidadeSonoPredominante
      ? `Qualidade: ${painel!.qualidadeSonoPredominante}`
      : 'Ainda sem dados de sono'
    : mostrarExemplo ? 'Qualidade: Boa' : '—';

  const frequenciaExibida = temDados ? `${painel!.checkinsEstaSemana ?? 0}/7` : mostrarExemplo ? '6/7' : '—';
  const emocoesExibidas = temDados
    ? (painel!.emocoesRecentes ?? []).map(rotularEmocao)
    : mostrarExemplo ? EMOCOES_EXEMPLO : [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Animated.ScrollView onScroll={rolar} scrollEventThrottle={16} showsVerticalScrollIndicator={false}>

        <Animated.View style={estiloHeader}>
          <LinearGradient
            colors={gradienteMarca}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.header, { borderRadius: theme.borderRadius.xl, paddingTop: insets.top + 12 }]}
          >
            <View style={styles.headerTop}>
              <View style={styles.saudacao}>
                <Text style={styles.greeting}>{texto}, {nome} {emoji}</Text>
                <Text style={styles.headerSubtitle}>Seu bem-estar importa.</Text>
              </View>
              <TouchableOpacity
                style={[styles.avatarButton, { borderColor: 'rgba(255,255,255,0.6)' }]}
                onPress={() => setSheetContaAberta(true)}
                accessibilityRole="button"
                accessibilityLabel={`Conta de ${nome}. Toque para opções de conta e aparência`}
              >
                <Text style={styles.avatarText} maxFontSizeMultiplier={1.4}>{nome[0]}</Text>
                <View style={styles.avatarGear}>
                  <Feather name="settings" size={10} color="#FFF" />
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.checkinCard, { backgroundColor: 'rgba(0,0,0,0.10)' }]}
              onPress={() => navigation.navigate('Checkin')}
              accessibilityRole="button"
            >
              <View style={[styles.checkinIconContainer, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Feather name="heart" size={20} color="#FFF" />
              </View>
              <View style={styles.checkinTextContainer}>
                <Text style={styles.checkinTitle}>Como você está hoje?</Text>
                <Text style={styles.checkinSubtitle}>Fazer check-in de hoje</Text>
              </View>
              <Feather name="arrow-right" size={20} color="#FFF" />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        <View style={styles.content}>
          <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, borderColor: theme.colors.outlineVariant }]}
            onPress={() => navigation.navigate('Consultas')}
            accessibilityRole="button"
            accessibilityHint="Abre a lista de consultas"
          >
            <View style={styles.cardHeader}>
              <Feather name="calendar" size={18} color={theme.colors.primary} />
              <Text style={[styles.cardTitle, styles.consultaTitulo, { color: theme.colors.onSurface }]}>
                Próxima consulta
              </Text>
              <Feather name="chevron-right" size={18} color={theme.colors.subtext1} />
            </View>
            {erroConsultas ? (
              <Text style={[styles.consultaDetalhe, { color: theme.colors.subtext1 }]}>
                Não foi possível carregar suas consultas.
              </Text>
            ) : !consultas ? (
              <ActivityIndicator color={theme.colors.primary} accessibilityLabel="Carregando consultas" style={styles.consultaCarregando} />
            ) : proximaConsulta ? (
              <>
                <Text style={[styles.consultaData, { color: theme.colors.onSurface }]}>{proximaConsulta.data}</Text>
                <Text style={[styles.consultaDetalhe, { color: theme.colors.subtext1 }]}>{proximaConsulta.horario}</Text>
                <Text style={[styles.consultaDetalhe, { color: theme.colors.subtext1 }]}>com {proximaConsulta.nome}</Text>
              </>
            ) : (
              <Text style={[styles.consultaDetalhe, { color: theme.colors.subtext1 }]}>
                Nenhuma consulta agendada.
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, borderColor: theme.colors.outlineVariant }]}
            onPress={() => navigation.navigate('Diario')}
            accessibilityRole="button"
            accessibilityHint="Abre o diário"
          >
            <View style={styles.cardHeader}>
              <Feather name="book-open" size={18} color={theme.colors.primary} />
              <Text style={[styles.cardTitle, styles.consultaTitulo, { color: theme.colors.onSurface }]}>Diário</Text>
              <Feather name="chevron-right" size={18} color={theme.colors.subtext1} />
            </View>
            <Text style={[styles.consultaDetalhe, { color: theme.colors.subtext1 }]}>
              Escreva quando quiser, quantas vezes quiser.
            </Text>
          </TouchableOpacity>

          {/* Só exibe o selo de demonstração APÓS carregar, sem erro e sem dados reais */}
          {mostrarExemplo && (
            <>
              <SeloDemonstracao style={{ alignSelf: 'flex-start', marginBottom: 8 }} />
              <Text style={[styles.dadosExemploAviso, { color: theme.colors.onSurfaceVariant }]}>
                Estes números são um exemplo. Faça seu check-in diário para ver os seus aqui.
              </Text>
            </>
          )}
          {erroPainel && !temDados && !carregandoPainel && (
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, borderColor: theme.colors.outlineVariant }]}>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 14, lineHeight: 20 }}>
                Não foi possível carregar seus dados agora. Verifique sua conexão.
              </Text>
              <TouchableOpacity onPress={() => setTentativaPainel((n) => n + 1)} accessibilityRole="button">
                <Text style={{ color: theme.colors.primary, fontWeight: '600', marginTop: 8 }}>
                  Tentar de novo
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {temDados && painel?.inativo && (
            <Text style={[styles.dadosExemploAviso, { color: theme.colors.onSurfaceVariant }]}>
              Faz um tempo que você não registra. Seus números desta semana estão zerados — faça um check-in hoje.
            </Text>
          )}

          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, borderColor: theme.colors.outlineVariant }]}>
              <Feather name="smile" size={22} color={theme.colors.primary} style={styles.metricIcon} />
              <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>Humor médio</Text>
              <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>
                {carregandoPainel ? '...' : (humorMedioExibido ?? '—')}
              </Text>
              {humorTendenciaExibida && (
                <Text style={[styles.metricTrend, { color: theme.colors.onSurface }]}>
                  {humorTendenciaExibida}
                </Text>
              )}
            </View>

            <View style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, borderColor: theme.colors.outlineVariant }]}>
              <Feather name="activity" size={22} color={theme.colors.primary} style={styles.metricIcon} />
              <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>Ansiedade</Text>
              <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>
                {carregandoPainel ? '...' : (ansiedadeMediaExibida ?? '—')}
              </Text>
              {ansiedadeTendenciaExibida && (
                <Text style={[styles.metricTrend, { color: theme.colors.onSurface }]}>
                  {ansiedadeTendenciaExibida}
                </Text>
              )}
            </View>

            <View style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, borderColor: theme.colors.outlineVariant }]}>
              <Feather name="moon" size={22} color={theme.colors.primary} style={styles.metricIcon} />
              <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>Sono</Text>
              <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>
                {carregandoPainel ? '...' : sonoExibido}
              </Text>
              <Text style={[styles.metricQuality, { color: theme.colors.onSurfaceVariant }]}>
                {qualidadeSonoExibida}
              </Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, borderColor: theme.colors.outlineVariant }]}>
              <Feather name="trending-up" size={22} color={theme.colors.primary} style={styles.metricIcon} />
              <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>Frequência</Text>
              <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>
                {carregandoPainel ? '...' : frequenciaExibida}
              </Text>
              <Text style={[styles.metricQuality, { color: theme.colors.onSurfaceVariant }]}>
                Check-ins semanais
              </Text>
            </View>
          </View>

          {emocoesExibidas.length > 0 && (
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, borderColor: theme.colors.outlineVariant }]}>
              <View style={styles.cardHeader}>
                <Feather name="zap" size={18} color={theme.colors.primary} />
                <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Emoções Recentes</Text>
              </View>
              <View style={styles.emocoesContainer}>
                {emocoesExibidas.map((emocao, index) => (
                  <View key={`${emocao}-${index}`} style={[styles.emocaoTag, { backgroundColor: theme.colors.secondaryContainer }]}>
                    <Text style={[styles.emocaoText, { color: theme.colors.onSecondaryContainer }]}>{emocao}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {temDados && painel?.percepcao && (
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, borderColor: theme.colors.outlineVariant }]}>
              <View style={styles.cardHeader}>
                <Feather name="heart" size={18} color={theme.colors.primary} />
                <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Pequenas percepções</Text>
              </View>
              <View
                style={{
                  backgroundColor: theme.colors.primaryContainer,
                  borderRadius: theme.borderRadius.lg,
                  padding: 12,
                  marginTop: 4,
                }}
              >
                <Text style={{ color: theme.colors.onPrimaryContainer, fontSize: 14, lineHeight: 20 }}>
                  {painel.percepcao}
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.sugestaoCard, { backgroundColor: theme.colors.primaryContainer, borderRadius: theme.borderRadius.lg }]}
            onPress={() => setRespirandoAberta(true)}
            accessibilityRole="button"
            accessibilityLabel="Abrir exercício de respiração guiada"
          >
            <View style={[styles.sugestaoIconContainer, { backgroundColor: theme.colors.surface }]}>
              <Feather name="wind" size={28} color={theme.colors.primary} />
            </View>
            <View style={styles.sugestaoTextContainer}>
              <Text style={[styles.sugestaoTitle, { color: theme.colors.onPrimaryContainer }]}>Que tal relaxar?</Text>
              <Text style={[styles.sugestaoSubtitle, { color: theme.colors.onPrimaryContainer }]}>Experimente um exercício de respiração</Text>
            </View>
            <Feather name="arrow-right" size={18} color={theme.colors.primary} />
          </TouchableOpacity>

        </View>
      </Animated.ScrollView>

      <SheetConta
        visivel={sheetContaAberta}
        aoFechar={() => setSheetContaAberta(false)}
        nome={nome}
        mode={mode}
        setMode={setMode}
        onSair={sairDaConta}
        psicologoVinculado={psicologo}
        onPsicologoPrivacidade={() => {
          setSheetContaAberta(false);
          navigation.navigate('Consentimento');
        }}
      />

      <ExercicioRespiracao visivel={respirandoAberta} aoFechar={() => setRespirandoAberta(false)} />
    </View>
  );
}