import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NOTA_MINIMA, useForcaSenha } from '../../lib/forcaSenha';
import { useTheme } from '../../theme/ThemeContext';

const NIVEIS = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'];

export default function MedidorSenha({ senha }: { senha: string }) {
  const { theme } = useTheme();
  const forca = useForcaSenha(senha);
  if (!forca) return null;
  const { nota, aviso } = forca;
  const cor = nota < NOTA_MINIMA ? theme.colors.error : nota === 2 ? theme.colors.tertiary : theme.colors.primary;
  // O teal do tema claro dá 3,4:1: serve para a barra (gráfico, 3:1), não para texto de 12 px (4,5:1).
  const corNivel = nota === 2 ? theme.colors.onSurface : cor;
  const texto = `${NIVEIS[nota]}${nota < NOTA_MINIMA ? ' · não será aceita' : ''}${aviso ? `. ${aviso}` : ''}`;

  return (
    <View
      style={styles.medidor}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Força da senha"
      accessibilityValue={{ min: 0, max: 5, now: nota + 1, text: texto }}
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.trilho, { backgroundColor: theme.colors.surfaceVariant }]}>
        <View style={[styles.barra, { width: `${(nota + 1) * 20}%`, backgroundColor: cor }]} />
      </View>
      <Text style={[styles.texto, { color: theme.colors.onSurfaceVariant }]} maxFontSizeMultiplier={1.4}>
        <Text style={[styles.nivel, { color: corNivel }]}>{NIVEIS[nota]}</Text>
        {texto.slice(NIVEIS[nota].length)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  medidor: { marginTop: 8, gap: 4 },
  trilho: { height: 4, borderRadius: 2, overflow: 'hidden' },
  barra: { height: '100%', borderRadius: 2 },
  texto: { fontSize: 12, lineHeight: 16, marginLeft: 4 },
  nivel: { fontWeight: '600' },
});
