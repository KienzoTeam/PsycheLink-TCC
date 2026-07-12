import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },

  logo: {
    width: 120,
    height: 120,
    marginBottom: 10,
  },

  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#4c4f69',
  },

  subtitle: {
    fontSize: 18,
    color: '#6c6f85',
    marginBottom: 30,
  },

  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 30,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },

  label: {
    fontSize: 15,
    color: '#4c4f69',
    marginBottom: 8,
    fontWeight: '500',
  },

  input: {
    height: 55,
    borderWidth: 1,
    borderColor: '#bcc0cc',
    borderRadius: 15,
    paddingHorizontal: 18,
    marginBottom: 18,
    backgroundColor: '#e6e9ef',
    fontSize: 15,
  },

  loginButton: {
    height: 55,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
  },

  loginButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },

  linkText: {
    textAlign: 'center',
    marginTop: 22,
    color: '#8839ef',
    fontWeight: '600',
  },

  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 25,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#ccd0da',
  },

  separatorText: {
    marginHorizontal: 10,
    color: '#9ca0b0',
  },

  registerButton: {
    height: 55,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#8839ef',
    justifyContent: 'center',
    alignItems: 'center',
  },

  registerButtonText: {
    color: '#8839ef',
    fontSize: 17,
    fontWeight: '700',
  },

  footer: {
    marginTop: 25,
    textAlign: 'center',
    color: '#6c6f85',
    fontSize: 12,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
});
