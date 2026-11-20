import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { vibrarLeve } from '../../lib/hapticos';

export const PERIODOS = [
  { dias: 7, rotulo: '7 dias', falado: 'Últimos 7 dias' },
  { dias: 30, rotulo: '30 dias', falado: 'Últimos 30 dias' },
  { dias: 90, rotulo: '3 meses', falado: 'Últimos 3 meses' },
  { dias: 365, rotulo: '12 meses', falado: 'Últimos 12 meses' },
] as const;

export type Periodo = (typeof PERIODOS)[number]['dias'];

// Botão segmentado do M3 (contornado): 40dp, contorno de 1dp, cantos totalmente arredondados,
// selecionado em secondaryContainer com o ✓ de 18dp.
export default function FiltroPeriodo({ valor, aoMudar }: { valor: Periodo; aoMudar: (p: Periodo) => void }) {
  const { theme } = useTheme();
  return (
    <View
      style={[estilos.grupo, { borderColor: theme.colors.outline }]}
      accessibilityRole="radiogroup"
      accessibilityLabel="Período"
    >
      {PERIODOS.map(({ dias, rotulo, falado }, i) => {
        const ativo = dias === valor;
        return (
          <TouchableOpacity
            key={dias}
            style={[
              estilos.segmento,
              i > 0 && { borderLeftWidth: 1, borderLeftColor: theme.colors.outline },
              ativo && { backgroundColor: theme.colors.secondaryContainer },
            ]}
            onPress={() => {
              if (ativo) return;
              vibrarLeve();
              aoMudar(dias);
            }}
            hitSlop={{ top: 4, bottom: 4 }}
            accessibilityRole="radio"
            accessibilityLabel={falado}
            accessibilityState={{ checked: ativo }}
          >
            {ativo && <Feather name="check" size={18} color={theme.colors.onSecondaryContainer} />}
            <Text
              style={[estilos.rotulo, { color: ativo ? theme.colors.onSecondaryContainer : theme.colors.onSurface }]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {rotulo}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: {
    flexDirection: 'row',
    height: 40,
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  segmento: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  rotulo: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});
