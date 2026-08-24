import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  sosButton: {
    height: 80,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 16,
    borderWidth: 2,
  },
  sosIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosTextContainer: {
    flex: 1,
  },
  sosTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sosSubtitle: {
    fontSize: 13,
  },
  exerciseCard: {
    marginTop: 16,
    padding: 24,
    borderRadius: 28,
    alignItems: 'center',
    gap: 16,
  },
  exerciseTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  exerciseButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  exerciseButtonText: {
    fontWeight: 'bold',
  },
});
