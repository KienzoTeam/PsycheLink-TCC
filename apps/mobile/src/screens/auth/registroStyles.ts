import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 50,
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
    color: '#fff',
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

  inactiveLabel: {
  },

  logo: {
    width: 80,
    height: 80,
    alignSelf: 'center',
  },

  logoText: {
    textAlign: 'center',
    fontSize: 24,
    marginTop: 8,
    fontWeight: '600',
  },

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

  checkboxContainer: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 30,
    alignItems: 'flex-start',
  },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    marginTop: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  termsText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
  },

  link: {
    fontWeight: '600',
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

  checkboxMark: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Mantendo os estilos de vinculação para uso futuro
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
    backgroundColor: '#ccd0da',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vinculacaoCircleAlt: {
    backgroundColor: '#bcc0cc',
  },
  vinculacaoIcon: {
    fontSize: 30,
  },
  vinculacaoArrow: {
    fontSize: 24,
    color: '#8839ef',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e6e9ef',
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    alignItems: 'flex-start',
    gap: 10,
  },
  infoIcon: {
    fontSize: 18,
  },
  infoText: {
    flex: 1,
    color: '#6c6f85',
    fontSize: 13,
    lineHeight: 20,
  },
  inputCenter: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 4,
    color: '#4c4f69',
  },
  emailLinkContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  emailLink: {
    color: '#8839ef',
    fontSize: 14,
    fontWeight: '500',
  },
  skipButton: {
    height: 55,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#ccd0da',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  skipButtonText: {
    color: '#8839ef',
    fontSize: 16,
    fontWeight: '500',
  },
});
