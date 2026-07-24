import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { styles } from './styleSOS';

export default function SOS() {
  const { theme, isDark } = useTheme();

  return (
    <ScrollView 
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
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
      >
        <View style={[styles.sosIconContainer, { backgroundColor: theme.colors.error }]}>
          <Feather name="phone" size={24} color="#fff" />
        </View>
        <View style={styles.sosTextContainer}>
          <Text style={[styles.sosTitle, { color: theme.colors.error }]}>Ligar para o CVV (188)</Text>
          <Text style={[styles.sosSubtitle, { color: theme.colors.error }]}>Centro de Valorização da Vida</Text>
        </View>
        <Feather name="chevron-right" size={20} color={theme.colors.error} />
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.sosButton, { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary }]}
      >
        <View style={[styles.sosIconContainer, { backgroundColor: theme.colors.primary }]}>
          <Feather name="message-square" size={24} color="#fff" />
        </View>
        <View style={styles.sosTextContainer}>
          <Text style={[styles.sosTitle, { color: theme.colors.primary }]}>Mensagem de Emergência</Text>
          <Text style={[styles.sosSubtitle, { color: theme.colors.primary }]}>Enviar alerta para seu psicólogo</Text>
        </View>
        <Feather name="chevron-right" size={20} color={theme.colors.primary} />
      </TouchableOpacity>

      <View style={[styles.exerciseCard, { backgroundColor: theme.colors.primaryContainer }]}>
        <Feather name="wind" size={40} color={theme.colors.primary} />
        <Text style={[styles.exerciseTitle, { color: theme.colors.onPrimaryContainer }]}>Precisa se acalmar?</Text>
        <Text style={{ textAlign: 'center', color: theme.colors.onPrimaryContainer, marginBottom: 8 }}>
          Vamos fazer um exercício rápido de respiração guiada de 1 minuto.
        </Text>
        <TouchableOpacity style={[styles.exerciseButton, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.exerciseButtonText, { color: theme.colors.onPrimary }]}>Começar Exercício</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}
