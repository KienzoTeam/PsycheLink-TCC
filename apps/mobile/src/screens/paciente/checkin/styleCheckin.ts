import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 55,
    paddingBottom: 20,
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },

  // Progress
  progressContainer: {
    marginBottom: 32,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },

  // Content
  content: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 32,
  },

  // Etapa 1 - Emoções Grid
  emocoesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  emocaoItem: {
    width: '47%',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  emocaoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Etapa 2 - Sliders
  slidersCard: {
    borderRadius: 16,
    padding: 20,
    gap: 24,
    marginBottom: 32,
  },
  sliderItem: {
    gap: 8,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  sliderValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    position: 'relative',
    justifyContent: 'center',
  },
  sliderFill: {
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    left: 0,
  },
  sliderThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    position: 'absolute',
  },

  // Etapa 3 - Sono
  sonoCard: {
    borderRadius: 16,
    padding: 20,
    gap: 20,
    marginBottom: 32,
  },
  qualidadeContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  qualidadeBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qualidadeText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Etapa 4 - Contextos Grid
  contextosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  contextoItem: {
    width: '47%',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  contextoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Etapa 5 - Hábitos
  habitosList: {
    gap: 12,
    marginBottom: 32,
  },
  habitoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 14,
  },
  habitoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  habitoLabel: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },

  // Etapa 6 - Notas
  notasInput: {
    height: 160,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    textAlignVertical: 'top',
    fontSize: 15,
    marginBottom: 16,
  },
  privacidadeBox: {
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 32,
  },
  privacidadeTexto: {
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },

  // Etapa 7 - Sucesso
  sucessoContainer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 32,
  },
  sucessoIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  sucessoTitulo: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sucessoSubtitulo: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  sucessoCard: {
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 32,
  },
  sucessoCardTexto: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
    marginBottom: 8,
  },
  sucessoCardSubTexto: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Footer botões
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  footerSingle: {
    marginTop: 8,
  },
  btnVoltar: {
    flex: 1,
    height: 55,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnVoltarTexto: {
    fontSize: 16,
    fontWeight: '600',
  },
});