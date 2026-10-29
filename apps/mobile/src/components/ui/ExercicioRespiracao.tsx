import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, Animated, Easing, TouchableOpacity, AccessibilityInfo } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';

const DURACAO = 60; // segundos

type Fase = 'Inspire' | 'Espire';

/**
 * Respiração guiada de 1 minuto — 100% local, zero backend.
 * Ciclos de 4s inspirando / 4s expirando, com círculo pulsando junto.
 */
export default function ExercicioRespiracao({ visivel, aoFechar }: { visivel: boolean; aoFechar: () => void }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const escala = useRef(new Animated.Value(1)).current;
  const [restante, setRestante] = useState(DURACAO);
  const [fase, setFase] = useState<Fase>('Inspire');
  const [concluido, setConcluido] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => listener.remove();
  }, []);

  useEffect(() => {
    if (!visivel) return;

    setRestante(DURACAO);
    setFase('Inspire');
    setConcluido(false);

    // Reduce Motion: fases e timer seguem, o círculo fica estático.
    const animacao = reduceMotion
      ? null
      : Animated.loop(
          Animated.sequence([
            Animated.timing(escala, { toValue: 1.5, duration: 4000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(escala, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          ])
        );
    animacao?.start();

    const trocaFase = setInterval(
      () => setFase(f => (f === 'Inspire' ? 'Espire' : 'Inspire')),
      4000
    );
    const relogio = setInterval(() => {
      setRestante(s => {
        if (s <= 1) {
          clearInterval(trocaFase);
          clearInterval(relogio);
          animacao?.stop();
          escala.setValue(1);
          setConcluido(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      animacao?.stop();
      clearInterval(trocaFase);
      clearInterval(relogio);
      escala.setValue(1);
    };
  }, [visivel, escala, reduceMotion]);

  // Translúcido nas duas barras: sem isso, no Android a tela de trás aparece na
  // status bar. O X desce pelo inset em vez de um topo fixo.
  return (
    <Modal
      visible={visivel}
      transparent
      animationType="fade"
      onRequestClose={aoFechar}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={[styles.overlay, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity
          style={[styles.fechar, { borderColor: theme.colors.outline, top: insets.top + 16 }]}
          onPress={aoFechar}
          accessibilityRole="button"
          accessibilityLabel="Encerrar exercício de respiração"
        >
          <Feather name="x" size={22} color={theme.colors.onSurface} />
        </TouchableOpacity>

        {concluido ? (
          <>
            <Text style={[styles.fase, { color: theme.colors.primary }]}>Pronto 💜</Text>
            <Text style={[styles.mensagem, { color: theme.colors.onSurfaceVariant }]}>
              Um minuto de pausa já muda o corpo. Volte quando quiser.
            </Text>
            <TouchableOpacity
              style={[styles.botaoFechar, { backgroundColor: theme.colors.primary }]}
              onPress={aoFechar}
              accessibilityRole="button"
              accessibilityLabel="Encerrar"
            >
              <Text style={[styles.botaoFecharTexto, { color: theme.colors.onPrimary }]}>Encerrar</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.fase, { color: theme.colors.primary }]} accessibilityLiveRegion="polite">
              {fase}
            </Text>
            <Animated.View
              style={[
                styles.circulo,
                {
                  backgroundColor: theme.colors.primaryContainer,
                  borderColor: theme.colors.outline,
                  transform: [{ scale: escala }],
                },
              ]}
            />
            <Text style={[styles.restante, { color: theme.colors.onSurfaceVariant }]}>{restante}s</Text>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  fechar: {
    position: 'absolute',
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fase: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 32,
  },
  circulo: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
  },
  restante: {
    fontSize: 16,
    marginTop: 32,
  },
  mensagem: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
  },
  botaoFechar: {
    height: 55,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  botaoFecharTexto: {
    fontSize: 16,
    fontWeight: '700',
  },
});
