import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 40,
  },

  logo: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },

  title: {
    fontSize: 32,
    fontWeight: '700',
  },

  subtitle: {
    fontSize: 16,
    marginBottom: 30,
  },

  card: {
    width: '100%',
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

  linkText: {
    textAlign: 'center',
    marginTop: 22,
    fontWeight: '600',
  },

  forgotPasswordText: {
    textAlign: 'center',
    marginTop: 15,
    fontSize: 14,
  },

  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 25,
  },

  line: {
    flex: 1,
    height: 1,
  },

  separatorText: {
    marginHorizontal: 10,
  },

  footer: {
    marginTop: 25,
    textAlign: 'center',
    fontSize: 12,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
});
