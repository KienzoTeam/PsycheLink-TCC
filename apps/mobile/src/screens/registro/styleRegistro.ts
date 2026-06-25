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
});