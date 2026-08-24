import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },

  subtitle: {
    fontSize: 16,
    marginBottom: 32,
  },

  card: {
    width: '100%',
    padding: 24,
    borderWidth: 1,
  },

  linkText: {
    textAlign: 'center',
    marginTop: 24,
    fontWeight: '600',
  },

  forgotPasswordText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
  },

  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },

  line: {
    flex: 1,
    height: 1,
  },

  separatorText: {
    marginHorizontal: 10,
  },

  footer: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 13,
    paddingHorizontal: 20,
    lineHeight: 19,
  },
});
