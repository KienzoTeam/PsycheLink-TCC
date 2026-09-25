import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  dadosExemploAviso: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
    marginTop: -8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  card: {
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  chartLegend: {
    fontSize: 13,
    marginBottom: 12,
  },
  chartPlaceholder: {
    height: 150,
    width: '100%',
    justifyContent: 'flex-end',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingBottom: 8,
  },
  bar: {
    flex: 1,
    borderRadius: 8,
  },
  barraComDia: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 6,
  },
  barraDia: {
    fontSize: 11,
  },
  historyList: {
    marginTop: 8,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  historyEmoji: {
    fontSize: 22,
  },
  historyContent: {
    flex: 1,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyTags: {
    fontSize: 12,
  },

  
});
