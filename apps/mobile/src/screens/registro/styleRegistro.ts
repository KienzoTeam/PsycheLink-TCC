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
    backgroundColor: '#7B68EE',
    justifyContent: 'center',
    alignItems: 'center',
  },

  inactiveStep: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5DFFF',
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
    backgroundColor: '#D8D0FF',
  },

  stepLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 30,
    paddingHorizontal: 10,
  },

  activeLabel: {
    color: '#6D5EF5',
    fontWeight: '600',
  },

  inactiveLabel: {
    color: '#B8AEDF',
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
    color: '#2D2154',
    marginTop: 10,
    fontWeight: '600',
  },

  title: {
    textAlign: 'center',
    fontSize: 40,
    fontWeight: 'bold',
    color: '#2D2154',
    marginTop: 20,
  },

  subtitle: {
    textAlign: 'center',
    fontSize: 16,
    color: '#7D74A5',
    marginTop: 10,
    lineHeight: 24,
    marginBottom: 30,
  },

  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D2154',
    marginBottom: 8,
    marginTop: 10,
  },

  input: {
    height: 55,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDD6FF',
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
    borderColor: '#B8AEDF',
    marginTop: 2,
    marginRight: 10,
  },

  termsText: {
    flex: 1,
    color: '#6E6792',
    fontSize: 14,
    lineHeight: 22,
  },

  link: {
    color: '#6D5EF5',
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
    color: '#6D5EF5',
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
    backgroundColor: '#DDD6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  vinculacaoCircleAlt: {
    backgroundColor: '#C8E6FF',
  },

  vinculacaoIcon: {
    fontSize: 30,
  },

  vinculacaoArrow: {
    fontSize: 24,
    color: '#6D5EF5',
  },

  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F0EEFF',
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
    color: '#6E6792',
    fontSize: 13,
    lineHeight: 20,
  },

  inputCenter: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 4,
    color: '#2D2154',
  },

  emailLinkContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: -10,
  },

  emailLink: {
    color: '#6D5EF5',
    fontSize: 14,
    fontWeight: '500',
  },

  skipButton: {
    height: 55,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#DDD6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },

  skipButtonText: {
    color: '#6D5EF5',
    fontSize: 16,
    fontWeight: '500',
  },

  checkboxChecked: {
  backgroundColor: '#7B68EE',
  borderColor: '#7B68EE',
},

checkboxMark: {
  color: '#FFF',
  fontSize: 13,
  fontWeight: 'bold',
},
});