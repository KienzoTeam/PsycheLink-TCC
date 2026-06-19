import {StyleSheet} from 'react-native';

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
    color: '#2d2d44',
  },

  subtitle: {
    fontSize: 18,
    color: '#6b7280',
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
    color: '#3f3f46',
    marginBottom: 8,
    fontWeight: '500',
  },

  input: {
    height: 55,
    borderWidth: 1,
    borderColor: '#d7c8ff',
    borderRadius: 15,
    paddingHorizontal: 18,
    marginBottom: 18,
    backgroundColor: '#fafafa',
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
    color: '#6c63ff',
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
    backgroundColor: '#d6d6d6',
  },

  separatorText: {
    marginHorizontal: 10,
    color: '#777',
  },

  registerButton: {
    height: 55,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#6c63ff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  registerButtonText: {
    color: '#6c63ff',
    fontSize: 17,
    fontWeight: '700',
  },

  footer: {
    marginTop: 25,
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 12,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
});




