import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SeloDemonstracao from '../../../components/ui/SeloDemonstracao';
import { styles } from './styleDados';

const historico = [
  { id: '1', data: 'Hoje, 24 Jul', humor: '🤩', tags: 'Feliz, Produtivo, Inspirado' },
  { id: '2', data: 'Ontem, 23 Jul', humor: '😐', tags: 'Calmo, Cansado' },
  { id: '3', data: 'Quarta, 22 Jul', humor: '🙂', tags: 'Energético, Feliz' },
  { id: '4', data: 'Terça, 21 Jul', humor: '😕', tags: 'Ansioso, Estressado' },
];

// Humor médio por dia, escala fixa de 0 a 10: a altura das barras é
// comparável entre si e contra o máximo da escala (sem distorção relativa).
const humorSemana = [6.2, 7.5, 8.1, 5.4, 7.8, 9.3, 8.6];
const ESCALA_MAX = 10;
const DIAS_SEMANA = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

// Leitor de tela anuncia o sentimento, não "face com boca reta".
const NOMES_HUMOR: Record<string, string> = {
  '🤩': 'muito feliz',
  '😐': 'neutro',
  '🙂': 'contente',
  '😕': 'desanimado',
};

export default function Dados() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView 
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: theme.colors.onBackground }]}>Estatísticas</Text>
      <SeloDemonstracao style={{ alignSelf: 'flex-start', marginBottom: 8 }} />
      <Text style={[styles.dadosExemploAviso, { color: theme.colors.onSurfaceVariant }]}>
        Exemplo: seus registros aparecem aqui conforme você fizer check-ins.
      </Text>

      {/* Card de Gráfico Mockado */}
      <View style={[
        styles.card,
        {
          backgroundColor: theme.colors.surfaceContainer,
          borderRadius: theme.borderRadius.xl,
          borderColor: theme.colors.outline
        }
      ]}>
        <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Progresso da Semana</Text>
        <Text style={[styles.chartLegend, { color: theme.colors.onSurfaceVariant }]}>
          Humor médio por dia, de 0 a 10
        </Text>
        <View style={styles.chartPlaceholder}>
          {humorSemana.map((valor, i) => (
            <View key={i} style={styles.barraComDia}>
              <View
                style={[
                  styles.bar,
                  {
                    height: `${(valor / ESCALA_MAX) * 100}%`,
                    backgroundColor: theme.colors.primary,
                    opacity: 0.45 + 0.55 * (valor / ESCALA_MAX)
                  }
                ]}
              />
              <Text
                style={[styles.barraDia, { color: theme.colors.onSurfaceVariant }]}
                maxFontSizeMultiplier={1.4}
              >
                {DIAS_SEMANA[i]}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Histórico */}
      <View style={[
        styles.card,
        {
          backgroundColor: theme.colors.surfaceContainer,
          borderRadius: theme.borderRadius.xl,
          borderColor: theme.colors.outline
        }
      ]}>
        <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Histórico Recente</Text>
        <View style={styles.historyList}>
          {historico.map((item) => (
            <View
              key={item.id}
              style={[styles.historyItem, { borderBottomColor: theme.colors.outline }]}
              accessibilityLabel={`${item.data}. Humor: ${NOMES_HUMOR[item.humor] ?? item.humor}. ${item.tags}`}
            >
              <Text style={styles.historyEmoji} accessible={false}>{item.humor}</Text>
              <View style={styles.historyContent}>
                <Text style={[styles.historyDate, { color: theme.colors.onSurface }]}>{item.data}</Text>
                <Text style={[styles.historyTags, { color: theme.colors.onSurfaceVariant }]}>{item.tags}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
