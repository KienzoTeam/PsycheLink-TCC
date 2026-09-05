import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, StatusBar
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';

export default function Escalas() {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.colors.background === '#181825' ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        <View style={styles.header}>
          <View style={[styles.headerIconBox, { backgroundColor: theme.colors.primaryContainer }]}>
            <Feather name="clipboard" size={22} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]}>Sobre as Escalas</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              As escalas psicológicas são ferramentas utilizadas pelo psicólogo durante o acompanhamento. Elas ajudam a avaliar aspectos específicos da sua saúde mental de forma estruturada.
            </Text>
          </View>
        </View>

        <View style={[styles.cardEmpty, { backgroundColor: theme.colors.surfaceContainer || '#fff', shadowColor: theme.colors.outline }]}>
          <View style={[styles.cardEmptyIcon, { backgroundColor: theme.colors.primaryContainer }]}>
            <Feather name="lock" size={32} color={theme.colors.primary} />
          </View>
          <Text style={[styles.cardEmptyTitle, { color: theme.colors.onBackground }]}>Nenhuma escala disponível</Text>
          <Text style={[styles.cardEmptyDesc, { color: theme.colors.onSurfaceVariant }]}>
            Seu psicólogo pode julgar necessário durante o acompanhamento. Você será notificado quando houver uma nova escala disponível.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            <Feather name="info" size={18} color={theme.colors.primary} /> Informações Importantes
          </Text>
          <View style={[styles.infoBox, { backgroundColor: theme.colors.surfaceContainer || '#fff', borderColor: theme.colors.outline }]}>
            {[
              'Não há respostas certas ou erradas, seja honesto.',
              'Os resultados são sigilosos e protegidos por sigilo profissional.',
              'Respostas podem levar de 10 a 30 minutos dependendo da escala.',
            ].map((item, i) => (
              <View key={i} style={styles.bulletRow}>
                <View style={[styles.bulletDot, { backgroundColor: theme.colors.primary }]} />
                <Text style={[styles.bulletText, { color: theme.colors.onSurface }]}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

    
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            <Feather name="clipboard" size={18} color={theme.colors.primary} /> Escalas Frequentemente Utilizadas
          </Text>
          <View style={[styles.listCard, { backgroundColor: theme.colors.surfaceContainer || '#fff', borderColor: theme.colors.outline }]}>
            {[
              'Inventário de Depressão de Beck (BDI)',
              'Escala de Ansiedade de Beck (BAI)',
              'Escala de Estresse Percebido (PSS)',
              'Questionário de Qualidade de Vida (WHOQOL)',
              'Escala de Satisfação com a Vida (SWLS)',
            ].map((escala, i) => (
              <View key={i} style={[styles.listItem, i !== 4 ? { borderBottomWidth: 1, borderBottomColor: theme.colors.outline } : null]}>
                <Feather name="check-circle" size={18} color={theme.colors.primary} style={{ marginRight: 10, marginTop: 2 }} />
                <Text style={[styles.listItemText, { color: theme.colors.onSurface }]}>{escala}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: 'flex-start',
  },
  headerIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E8FF',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: '#2D2A3A',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6C7086',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 12,
    color: '#2D2A3A',
  },
  cardEmpty: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#6C5CE7',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 3,
  },
  cardEmptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  cardEmptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2A3A',
    textAlign: 'center',
    marginBottom: 8,
  },
  cardEmptyDesc: {
    fontSize: 14,
    lineHeight: 20,
    color: '#8A8599',
    textAlign: 'center',
  },
  infoBox: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  bulletText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4A4559',
    flex: 1,
  },
  listCard: {
    borderRadius: 20,
    paddingVertical: 8,
    borderWidth: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D2A3A',
  },
});