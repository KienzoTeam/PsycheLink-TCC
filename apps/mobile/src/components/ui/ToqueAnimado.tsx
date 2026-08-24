import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Easing,
  StyleSheet,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

type Props = TouchableOpacityProps & {
  /** Interno cresce e estica para preencher o Touchable (botões cheios, ex. gradiente). */
  preencher?: boolean;
};

// Props de container do Touchable que o View interno precisa repetir
// para dispor os filhos exatamente como antes da animação.
const CHAVES_CONTAINER = [
  'flexDirection', 'alignItems', 'justifyContent',
  'gap', 'rowGap', 'columnGap', 'flexWrap',
];

// Entrada rápida e seca; retorno com leve overshoot tátil.
const MOLA_PRESSAO = { damping: 22, stiffness: 320 };
const MOLA_SOLTA = { damping: 13, stiffness: 190, mass: 0.9 };

/**
 * Toque com spring de micro-escala via react-native-reanimated:
 * worklets na UI thread, interrompíveis a qualquer momento.
 * O Touchable mantém TODOS os estilos (layout idêntico ao de antes);
 * a escala anima um View interno envolvendo o conteúdo.
 * Reduce Motion desliga a transform e mantém só o fade nativo do Touchable.
 */
export default function ToqueAnimado({
  style,
  children,
  onPressIn,
  onPressOut,
  preencher = false,
  ...rest
}: Props) {
  const escala = useSharedValue(1);
  const reduceMotion = useReducedMotion();

  const animacaoEscala = useAnimatedStyle(() => ({
    transform: [{ scale: escala.value }],
  }));

  const flat = (StyleSheet.flatten(style) || {}) as Record<string, unknown>;
  const interno: Record<string, unknown> = {};
  for (const chave of CHAVES_CONTAINER) {
    if (chave in flat) interno[chave] = flat[chave];
  }
  // Crescimento só em botão cheio (gradiente). Em chips, flexGrow encontra
  // a altura do scroll através do wrapper de transição das etapas e estica tudo.
  if (preencher) {
    interno.flexGrow = 1;
    interno.alignSelf = 'stretch';
  }

  const pressionar: TouchableOpacityProps['onPressIn'] = (e) => {
    if (!reduceMotion) escala.value = withSpring(0.97, MOLA_PRESSAO);
    onPressIn?.(e);
  };

  const soltar: TouchableOpacityProps['onPressOut'] = (e) => {
    if (!reduceMotion) escala.value = withSpring(1, MOLA_SOLTA);
    onPressOut?.(e);
  };

  return (
    <TouchableOpacity {...rest} style={style} onPressIn={pressionar} onPressOut={soltar}>
      <Animated.View style={[interno as ViewStyle, animacaoEscala]}>{children}</Animated.View>
    </TouchableOpacity>
  );
}
