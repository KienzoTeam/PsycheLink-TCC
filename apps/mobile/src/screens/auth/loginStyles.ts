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

  botaoSOS: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    marginTop: 24,
    paddingHorizontal: 16,
  },

  botaoSOSTexto: {
    fontSize: 16,
    fontWeight: '700',
  },

  footer: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 13,
    paddingHorizontal: 20,
    lineHeight: 19,
  },
});
