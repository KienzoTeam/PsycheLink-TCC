import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 40,
    flex: 1,
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  backText: {
    color: '#8839ef',
    fontSize: 16,
    marginLeft: 4,
  },

  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 30,
  },

  stepDot: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccd0da',
  },

  stepDotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8839ef',
  },

  logo: {
    width: 70,
    height: 70,
    alignSelf: 'center',
    marginBottom: 8,
  },

  logoText: {
    textAlign: 'center',
    fontSize: 20,
    color: '#4c4f69',
    fontWeight: '600',
    marginBottom: 24,
  },

  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#e6e9ef',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },

  iconText: {
    fontSize: 36,
  },

  title: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4c4f69',
    marginBottom: 12,
  },

  subtitle: {
    textAlign: 'center',
    fontSize: 15,
    color: '#6c6f85',
    lineHeight: 22,
    marginBottom: 30,
  },

  emailHighlight: {
    color: '#8839ef',
    fontWeight: '600',
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4c4f69',
    marginBottom: 8,
    letterSpacing: 0.5,
  },

  input: {
    height: 55,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bcc0cc',
    paddingHorizontal: 16,
    fontSize: 15,
    marginBottom: 20,
  },

  button: {
    height: 55,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },

  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 17,
  },

  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },

  codeInput: {
    width: 48,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#bcc0cc',
    backgroundColor: '#FFF',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4c4f69',
  },

  codeInputActive: {
    borderColor: '#8839ef',
  },

  demoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6e9ef',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },

  demoText: {
    color: '#8839ef',
    fontSize: 14,
  },

  demoCode: {
    fontWeight: 'bold',
  },

  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },

  resendText: {
    color: '#6c6f85',
    fontSize: 14,
  },

  resendLink: {
    color: '#8839ef',
    fontSize: 14,
    fontWeight: '600',
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 55,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bcc0cc',
    paddingHorizontal: 16,
    marginBottom: 20,
  },

  inputFlex: {
    flex: 1,
    fontSize: 15,
    color: '#4c4f69',
  },

  eyeText: {
    fontSize: 18,
  },
});
