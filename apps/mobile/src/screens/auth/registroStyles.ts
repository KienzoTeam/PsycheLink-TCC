import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeStep: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inactiveStep: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    fontWeight: 'bold',
  },
  line: {
    flex: 1,
    height: 2,
  },
  stepLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  activeLabel: {
    fontWeight: '600',
  },
  inactiveLabel: {},
  title: {
    textAlign: 'center',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 20,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 10,
    lineHeight: 24,
    marginBottom: 30,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  vinculacaoIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  vinculacaoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    alignItems: 'flex-start',
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  inputCenter: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 4,
  },
  erroCodigo: {
    fontSize: 13,
    marginTop: -8,
    marginBottom: 12,
    textAlign: 'center',
  },
  emailLinkContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  emailLink: {
    fontSize: 14,
    fontWeight: '500',
  },
  skipButton: {
    height: 55,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  secaoTitulo: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 8,
  },
  secaoSubtitulo: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
});