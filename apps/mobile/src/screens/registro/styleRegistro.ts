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
    backgroundColor: '#8839ef',
    justifyContent: 'center',
    alignItems: 'center',
  },

  inactiveStep: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ccd0da',
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
    backgroundColor: '#ccd0da',
  },

  stepLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 30,
    paddingHorizontal: 10,
  },

  activeLabel: {
    color: '#8839ef',
    fontWeight: '600',
  },

  inactiveLabel: {
    color: '#9ca0b0',
  },

  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 10,
  },

  logoText: {
    textAlign: 'center',
    fontSize: 28,
    color: '#4c4f69',
    marginTop: 10,
    fontWeight: '600',
  },

  title: {
    textAlign: 'center',
    fontSize: 40,
    fontWeight: 'bold',
    color: '#4c4f69',
    marginTop: 20,
  },

  subtitle: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6c6f85',
    marginTop: 10,
    lineHeight: 24,
    marginBottom: 30,
  },

  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4c4f69',
    marginBottom: 8,
    marginTop: 10,
  },

  input: {
    height: 55,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bcc0cc',
    paddingHorizontal: 16,
    fontSize: 15,
  },

  checkboxContainer: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 30,
    alignItems: 'flex-start',
  },

  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#9ca0b0',
    marginTop: 2,
    marginRight: 10,
  },

  termsText: {
    flex: 1,
    color: '#6c6f85',
    fontSize: 14,
    lineHeight: 22,
  },

  link: {
    color: '#8839ef',
    textDecorationLine: 'underline',
  },

  button: {
    height: 55,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 17,
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  backText: {
    color: '#8839ef',
    fontSize: 16,
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

  checkboxChecked: {
    backgroundColor: '#1e66f5',
    borderColor: '#1e66f5',
  },

  checkboxMark: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
