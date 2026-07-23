import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingTop: 55,
    paddingBottom: 30,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#D8D0FF',
    marginTop: 4,
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  checkinCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkinIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkinIcon: {
    fontSize: 20,
  },
  checkinTextContainer: {
    flex: 1,
  },
  checkinTitle: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  checkinSubtitle: {
    color: '#D8D0FF',
    fontSize: 13,
    marginTop: 2,
  },
  checkinArrow: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    width: '47%',
    shadowColor: '#7B68EE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  metricIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 13,
    color: '#7D74A5',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D2154',
    marginBottom: 4,
  },
  metricTrend: {
    fontSize: 12,
    fontWeight: '500',
  },
  metricQuality: {
    fontSize: 12,
    color: '#7D74A5',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#7B68EE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardHeaderIcon: {
    fontSize: 18,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D2154',
  },
  emocoesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emocaoTag: {
    backgroundColor: '#F0EEFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emocaoText: {
    color: '#6D5EF5',
    fontSize: 14,
    fontWeight: '500',
  },
  percepcaoItem: {
    backgroundColor: '#F8F7FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  percepcaoText: {
    color: '#4A4270',
    fontSize: 14,
    lineHeight: 22,
  },
  sugestaoCard: {
    backgroundColor: '#F0EEFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 30,
  },
  sugestaoEmoji: {
    fontSize: 36,
  },
  sugestaoTextContainer: {
    flex: 1,
  },
  sugestaoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D2154',
  },
  sugestaoSubtitle: {
    fontSize: 13,
    color: '#7D74A5',
    marginTop: 2,
  },
});