import React, { useEffect, useRef } from 'react';
import { Animated, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeContext';
import { styles } from '../../screens/paciente/BemEstar/StyleBemEstar';
import { ExerciseStatus } from '../../constants/types';

interface BreathingCircleProps {
  status: ExerciseStatus;
  phaseTitle: string;
}

export function BreathingCircle({ status, phaseTitle }: BreathingCircleProps) {
  const { theme } = useTheme();
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (status !== 'running') {
      scale.stopAnimation();
      return;
    }

    const targetScale = phaseTitle === 'Expire' ? 0.92 : 1.08;

    Animated.timing(scale, {
      toValue: targetScale,
      duration: 900,
      useNativeDriver: true,
    }).start();
  }, [status, phaseTitle, scale]);

  useEffect(() => {
    if (status === 'idle') {
      scale.setValue(0.92);
    }
  }, [status, scale]);

  return (
    <Animated.View
      style={[
        styles.breathingOuterCircle,
        {
          backgroundColor: theme.colors.primaryContainer,
          transform: [{ scale }],
        },
      ]}
    >
      <Animated.View
        style={[styles.breathingInnerCircle, { backgroundColor: theme.colors.primary }]}
      >
        {/* onPrimary, não branco fixo: no tema escuro o primary é claro (branco dava 2:1). */}
        <Feather name="wind" size={28} color={theme.colors.onPrimary} />

        <Text
          style={[styles.breathingPhaseTitle, { color: theme.colors.onPrimary }]}
          maxFontSizeMultiplier={1.15}
        >
          {phaseTitle}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

export default BreathingCircle;
