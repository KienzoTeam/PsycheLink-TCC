import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { styles } from './styleDados';

const historico = [
  { id: '1', data: 'Hoje, 24 Jul', humor: '🤩', tags: 'Feliz, Produtivo, Inspirado' },
  { id: '2', data: 'Ontem, 23 Jul', humor: '😐', tags: 'Calmo, Cansado' },
  { id: '3', data: 'Quarta, 22 Jul', humor: '🙂', tags: 'Energético, Feliz' },
  { id: '4', data: 'Terça, 21 Jul', humor: '😕', tags: 'Ansioso, Estressado' },
];

const dadosGrafico = [30, 45, 60, 80, 50, 90, 100]; // Porcentagens de altura

export default function Dados() {
  const { theme, isDark } = useTheme();

  return (
    <ScrollView 
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: theme.colors.onBackground }]}>Estatísticas</Text>

      {/* Card de Gráfico Mockado */}
      <View style={[
        styles.card, 
        { 
          backgroundColor: isDark ? theme.colors.surface : '#fff',
          borderRadius: theme.borderRadius.xl 
        }
      ]}>
        <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Progresso da Semana</Text>
        <View style={styles.chartPlaceholder}>
          {dadosGrafico.map((height, i) => (
            <View 
              key={i} 
              style={[
                styles.bar, 
                { 
                  height: `${height}%`, 
                  backgroundColor: theme.colors.primary,
                  opacity: 0.3 + (height / 150)
                }
              ]} 
            />
          ))}
        </View>
      </View>

      {/* Histórico */}
      <View style={[
        styles.card, 
        { 
          backgroundColor: isDark ? theme.colors.surface : '#fff',
          borderRadius: theme.borderRadius.xl 
        }
      ]}>
        <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Histórico Recente</Text>
        <View style={styles.historyList}>
          {historico.map((item) => (
            <View key={item.id} style={[styles.historyItem, { borderBottomColor: theme.colors.outline }]}>
              <Text style={styles.historyEmoji}>{item.humor}</Text>
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
