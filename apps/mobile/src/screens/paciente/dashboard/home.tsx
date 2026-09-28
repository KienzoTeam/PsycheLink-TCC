import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { CommonActions, CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
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
  const [painel, setPainel] = useState<PainelCheckin | null>(null);
  const [carregandoPainel, setCarregandoPainel] = useState(true);

  // Recarrega toda vez que a Home ganha foco
  useFocusEffect(
    useCallback(() => {
      let telaAtiva = true;

      buscarPainelCheckin()
        .then((dados) => {
          if (telaAtiva) setPainel(dados);
        })
        .catch((erro) => {
          console.warn('Não foi possível carregar o painel da Home:', erro);
          if (telaAtiva) setPainel({ semDados: true });
        })
        .finally(() => {
          if (telaAtiva) setCarregandoPainel(false);
        });

      return () => {
        telaAtiva = false;
      };
    }, []),
  );

  const temDados = painel !== null && !painel.semDados;

  // Parallax: o header sobe mais devagar que o conteúdo
  const scrollY = useSharedValue(0);
  const rolar = useAnimatedScrollHandler(e => {
    scrollY.value = e.contentOffset.y;
  });
  const estiloHeader = useAnimatedStyle(() => ({
    transform: [{ translateY: scrollY.value * 0.35 }],
  }));

  const sairDaConta = async () => {
    setSheetContaAberta(false);
    await logout();
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] })
    );
  };

  const nome = usuario?.nome?.trim() || 'Usuário';
  const { texto, emoji } = getGreeting();

  const humorMedioExibido = temDados ? (painel!.humorMedio ?? null) : 7.5;
  const humorTendenciaExibida = temDados
    ? formatarTendencia(painel!.humorVariacaoSemana)
    : '↑ +0.8 esta semana';

  const ansiedadeMediaExibida = temDados ? (painel!.ansiedadeMedia ?? null) : 4.2;
  const ansiedadeTendenciaExibida = temDados
    ? formatarTendencia(painel!.ansiedadeVariacaoSemana)
    : '↓ -1.2 esta semana';

  const sonoExibido = temDados
    ? painel!.sonoMedioHoras !== null && painel!.sonoMedioHoras !== undefined
      ? `${painel!.sonoMedioHoras}h`
      : '—'
    : '7.2h';
  const qualidadeSonoExibida = temDados
    ? painel!.qualidadeSonoPredominante
      ? `Qualidade: ${painel!.qualidadeSonoPredominante}`
      : 'Ainda sem dados de sono'
    : 'Qualidade: Boa';

  const frequenciaExibida = temDados ? `${painel!.checkinsEstaSemana ?? 0}/7` : '6/7';
  const emocoesExibidas = temDados ? (painel!.emocoesRecentes ?? []) : EMOCOES_EXEMPLO;

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
              <View>
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
          {/* Só exibe o selo de demonstração APÓS carregar e confirmar que NÃO há dados reais */}
          {!carregandoPainel && !temDados && (
            <>
              <SeloDemonstracao style={{ alignSelf: 'flex-start', marginBottom: 8 }} />
              <Text style={[styles.dadosExemploAviso, { color: theme.colors.onSurfaceVariant }]}>
                Estes números são um exemplo. Faça seu check-in diário para ver os seus aqui.
              </Text>
            </>
          )}

          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, borderColor: theme.colors.outline }]}>
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

            <View style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, borderColor: theme.colors.outline }]}>
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

            <View style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, borderColor: theme.colors.outline }]}>
              <Feather name="moon" size={22} color={theme.colors.primary} style={styles.metricIcon} />
              <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>Sono</Text>
              <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>
                {carregandoPainel ? '...' : sonoExibido}
              </Text>
              <Text style={[styles.metricQuality, { color: theme.colors.onSurfaceVariant }]}>
                {qualidadeSonoExibida}
              </Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, borderColor: theme.colors.outline }]}>
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
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, borderColor: theme.colors.outline }]}>
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
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, borderColor: theme.colors.outline }]}>
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
      />

      <ExercicioRespiracao visivel={respirandoAberta} aoFechar={() => setRespirandoAberta(false)} />
    </View>
  );
}