import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  style?: ViewStyle;
}

/**
 * Marca visível de conteúdo simulado em telas de demonstração.
 * Texto em onSurface (não onSurfaceVariant): o selo precisa ser lido
 * onde ele aparece — 5.2:1+ nos dois temas.
 */
export default function SeloDemonstracao({ style }: Props) {
  const { theme } = useTheme();

  return (
    <View
      style={[styles.selo, { backgroundColor: theme.colors.surfaceVariant }, style]}
      accessibilityRole="text"
      accessibilityLabel="Conteúdo de demonstração"
    >
      <Feather name="tool" size={12} color={theme.colors.onSurface} />
      <Text style={[styles.texto, { color: theme.colors.onSurface }]}>
        demonstração
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  texto: {
    fontSize: 12,
    fontWeight: '600',
  },
});

