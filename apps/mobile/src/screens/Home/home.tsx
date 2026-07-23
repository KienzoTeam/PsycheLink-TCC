import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/AppNavigator';
import BottomNavBar from '../../components/Button/BottomNavBar';
import { styles } from './styleHome';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return { texto: 'Bom dia', emoji: '☀️' };
  if (hour < 18) return { texto: 'Boa tarde', emoji: '🌤️' };
  return { texto: 'Boa noite', emoji: '🌙' };
};

export default function Home({ navigation, route }: Props) {
  const nome = 'Júlia';
  const { texto, emoji } = getGreeting();
  const emocoes = ['Calmo', 'Feliz', 'Ansioso', 'Energético', 'Cansado'];

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F2FF' }}>
      <ScrollView showsVerticalScrollIndicator={false}>

        <LinearGradient
          colors={['#7B68EE', '#6957E8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{texto}, {nome} {emoji}</Text>
              <Text style={styles.headerSubtitle}>Seu bem-estar importa.</Text>
            </View>
            <TouchableOpacity style={styles.avatarButton}>
              <Text style={styles.avatarText}>{nome[0]}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.checkinCard}>
            <View style={styles.checkinIconContainer}>
              <Feather name="heart" size={20} color="#FFF" />
            </View>
            <View style={styles.checkinTextContainer}>
              <Text style={styles.checkinTitle}>Como você está hoje?</Text>
              <Text style={styles.checkinSubtitle}>Fazer check-in de hoje</Text>
            </View>
            <Feather name="arrow-right" size={20} color="#FFF" />
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.content}>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Feather name="smile" size={22} color="#7B68EE" style={styles.metricIcon} />
              <Text style={styles.metricLabel}>Humor médio</Text>
              <Text style={styles.metricValue}>7.5</Text>
              <Text style={[styles.metricTrend, { color: '#4CAF50' }]}>↑ +0.8 esta semana</Text>
            </View>

            <View style={styles.metricCard}>
              <Feather name="activity" size={22} color="#7B68EE" style={styles.metricIcon} />
              <Text style={styles.metricLabel}>Ansiedade</Text>
              <Text style={styles.metricValue}>4.2</Text>
              <Text style={[styles.metricTrend, { color: '#FF6B6B' }]}>↓ -1.2 esta semana</Text>
            </View>

            <View style={styles.metricCard}>
              <Feather name="moon" size={22} color="#7B68EE" style={styles.metricIcon} />
              <Text style={styles.metricLabel}>Sono</Text>
              <Text style={styles.metricValue}>7.2h</Text>
              <Text style={styles.metricQuality}>Qualidade: Boa</Text>
            </View>

            <View style={styles.metricCard}>
              <Feather name="trending-up" size={22} color="#7B68EE" style={styles.metricIcon} />
              <Text style={styles.metricLabel}>Frequência</Text>
              <Text style={styles.metricValue}>6/7</Text>
              <Text style={styles.metricQuality}>Check-ins semanais</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="zap" size={18} color="#7B68EE" />
              <Text style={styles.cardTitle}>Emoções Recentes</Text>
            </View>
            <View style={styles.emocoesContainer}>
              {emocoes.map((emocao, index) => (
                <View key={index} style={styles.emocaoTag}>
                  <Text style={styles.emocaoText}>{emocao}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="heart" size={18} color="#7B68EE" />
              <Text style={styles.cardTitle}>Pequenas percepções</Text>
            </View>
            <View style={styles.percepcaoItem}>
              <Text style={styles.percepcaoText}>
                Você registrou mais momentos de calma nesta semana.
              </Text>
            </View>
            <View style={styles.percepcaoItem}>
              <Text style={styles.percepcaoText}>
                Seu sono esteve mais regular nos últimos dias.
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.sugestaoCard}>
            <View style={styles.sugestaoIconContainer}>
              <Feather name="wind" size={28} color="#7B68EE" />
            </View>
            <View style={styles.sugestaoTextContainer}>
              <Text style={styles.sugestaoTitle}>Que tal relaxar?</Text>
              <Text style={styles.sugestaoSubtitle}>Experimente um exercício de respiração</Text>
            </View>
            <Feather name="arrow-right" size={18} color="#7B68EE" />
          </TouchableOpacity>

        </View>
      </ScrollView>

      <BottomNavBar navigation={navigation} telaAtual="Home" />
    </View>
  );
}