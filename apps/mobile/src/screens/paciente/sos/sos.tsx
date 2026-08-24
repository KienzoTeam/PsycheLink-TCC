import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ExercicioRespiracao from '../../../components/ui/ExercicioRespiracao';
import { styles } from './styleSOS';

export default function SOS() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [respirandoAberto, setRespirandoAberto] = useState(false);

  return (
    <ScrollView 
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Feather name="alert-circle" size={60} color={theme.colors.error} />
        <Text style={[styles.title, { color: theme.colors.onBackground, marginTop: 16 }]}>Você não está sozinho</Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Se você estiver em perigo imediato ou precisando falar com alguém agora, use um dos recursos abaixo.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.sosButton, { backgroundColor: theme.colors.error + '10', borderColor: theme.colors.error }]}
        onPress={() => Linking.openURL('tel:188')}
        accessibilityRole="button"
      >
        <View style={[styles.sosIconContainer, { backgroundColor: theme.colors.error }]}>
          <Feather name="phone" size={24} color={theme.colors.onError} />
        </View>
        <View style={styles.sosTextContainer}>
          <Text style={[styles.sosTitle, { color: theme.colors.error }]}>Ligar para o CVV (188)</Text>
          <Text style={[styles.sosSubtitle, { color: theme.colors.error }]}>Gratuito, 24 horas por dia</Text>
        </View>
        <Feather name="chevron-right" size={20} color={theme.colors.error} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.sosButton, { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary }]}
        onPress={() => Linking.openURL('https://www.cvv.org.br/chat/')}
        accessibilityRole="button"
        accessibilityLabel="Abrir chat do CVV"
      >
        <View style={[styles.sosIconContainer, { backgroundColor: theme.colors.primary }]}>
          <Feather name="message-square" size={24} color={theme.colors.onPrimary} />
        </View>
        <View style={styles.sosTextContainer}>
          <Text style={[styles.sosTitle, { color: theme.colors.primary }]}>Chat do CVV</Text>
          <Text style={[styles.sosSubtitle, { color: theme.colors.primary }]}>Conversa por texto, gratuita e confidencial</Text>
        </View>
        <Feather name="chevron-right" size={20} color={theme.colors.primary} />
      </TouchableOpacity>

      <View style={[styles.exerciseCard, { backgroundColor: theme.colors.primaryContainer }]}>
        <Feather name="wind" size={40} color={theme.colors.primary} />
        <Text style={[styles.exerciseTitle, { color: theme.colors.onPrimaryContainer }]}>Precisa se acalmar?</Text>
        <Text style={{ textAlign: 'center', color: theme.colors.onPrimaryContainer, marginBottom: 8 }}>
          Vamos fazer um exercício rápido de respiração guiada de 1 minuto.
        </Text>
        <TouchableOpacity
          style={[styles.exerciseButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => setRespirandoAberto(true)}
          accessibilityRole="button"
        >
          <Text style={[styles.exerciseButtonText, { color: theme.colors.onPrimary }]}>Começar Exercício</Text>
        </TouchableOpacity>
      </View>

      <ExercicioRespiracao visivel={respirandoAberto} aoFechar={() => setRespirandoAberto(false)} />
    </ScrollView>
  );
}
