import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  // flex: 1 deixa nome longo ou fonte grande quebrar linha em vez de empurrar o avatar para fora.
  saudacao: {
    flex: 1,
    marginRight: 12,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#EDEAFF',
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
  avatarGear: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
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
  checkinTextContainer: {
    flex: 1,
  },
  checkinTitle: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  checkinSubtitle: {
    color: '#EDEAFF',
    fontSize: 13,
    marginTop: 4,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  dadosExemploAviso: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: -8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    borderRadius: 20,
    padding: 16,
    width: '47%',
    borderWidth: 1,
  },
  metricIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricTrend: {
    fontSize: 12,
    fontWeight: '500',
  },
  metricQuality: {
    fontSize: 12,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  consultaTitulo: {
    flex: 1,
  },
  consultaData: {
    fontSize: 18,
    fontWeight: '700',
  },
  consultaDetalhe: {
    fontSize: 14,
    lineHeight: 20,
  },
  consultaCarregando: {
    alignSelf: 'flex-start',
  },
  emocoesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emocaoTag: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emocaoText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sugestaoCard: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  },
  sugestaoIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sugestaoTextContainer: {
    flex: 1,
  },
  sugestaoTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sugestaoSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
});
