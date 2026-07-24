import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { styles } from './styleHome';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return { texto: 'Bom dia', emoji: '☀️' };
  if (hour < 18) return { texto: 'Boa tarde', emoji: '🌤️' };
  return { texto: 'Boa noite', emoji: '🌙' };
};

export default function Home() {
  const { theme, isDark } = useTheme();
  const nome = 'Júlia';
  const { texto, emoji } = getGreeting();
  const emocoes = ['Calmo', 'Feliz', 'Ansioso', 'Energético', 'Cansado'];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false}>

        <LinearGradient
          colors={[theme.colors.primary, theme.colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { borderRadius: theme.borderRadius.xl }]}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{texto}, {nome} {emoji}</Text>
              <Text style={[styles.headerSubtitle, { color: theme.colors.onPrimaryContainer }]}>Seu bem-estar importa.</Text>
            </View>
            <TouchableOpacity style={[styles.avatarButton, { borderColor: theme.colors.onPrimary }]}>
              <Text style={styles.avatarText}>{nome[0]}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.checkinCard, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <View style={[styles.checkinIconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Feather name="heart" size={20} color="#FFF" />
            </View>
            <View style={styles.checkinTextContainer}>
              <Text style={styles.checkinTitle}>Como você está hoje?</Text>
              <Text style={[styles.checkinSubtitle, { color: theme.colors.onPrimaryContainer }]}>Fazer check-in de hoje</Text>
            </View>
            <Feather name="arrow-right" size={20} color="#FFF" />
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.content}>

          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg }]}>
              <Feather name="smile" size={22} color={theme.colors.primary} style={styles.metricIcon} />
              <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>Humor médio</Text>
              <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>7.5</Text>
              <Text style={[styles.metricTrend, { color: theme.colors.tertiary }]}>↑ +0.8 esta semana</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg }]}>
              <Feather name="activity" size={22} color={theme.colors.primary} style={styles.metricIcon} />
              <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>Ansiedade</Text>
              <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>4.2</Text>
              <Text style={[styles.metricTrend, { color: theme.colors.error }]}>↓ -1.2 esta semana</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg }]}>
              <Feather name="moon" size={22} color={theme.colors.primary} style={styles.metricIcon} />
              <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>Sono</Text>
              <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>7.2h</Text>
              <Text style={[styles.metricQuality, { color: theme.colors.onSurfaceVariant }]}>Qualidade: Boa</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg }]}>
              <Feather name="trending-up" size={22} color={theme.colors.primary} style={styles.metricIcon} />
              <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>Frequência</Text>
              <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>6/7</Text>
              <Text style={[styles.metricQuality, { color: theme.colors.onSurfaceVariant }]}>Check-ins semanais</Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg }]}>
            <View style={styles.cardHeader}>
              <Feather name="zap" size={18} color={theme.colors.primary} />
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Emoções Recentes</Text>
            </View>
            <View style={styles.emocoesContainer}>
              {emocoes.map((emocao, index) => (
                <View key={index} style={[styles.emocaoTag, { backgroundColor: theme.colors.secondaryContainer }]}>
                  <Text style={[styles.emocaoText, { color: theme.colors.onSecondaryContainer }]}>{emocao}</Text>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity style={[styles.sugestaoCard, { backgroundColor: theme.colors.primaryContainer, borderRadius: theme.borderRadius.lg }]}>
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
      </ScrollView>
    </View>
  );
}
