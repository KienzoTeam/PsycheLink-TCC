import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  cartaoSeguranca: {
    borderRadius: 24,
    padding: 24,
  },
  cartaoSegurancaTituloLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cartaoSegurancaTitulo: {
    fontSize: 22,
    fontWeight: '800',
  },
  cartaoSegurancaSubtitulo: {
    fontSize: 14,
    lineHeight: 20,
  },
  botaoPrincipal: {
    borderRadius: 24,
    borderWidth: 2,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 4,
  },
  botaoPrincipalIcone: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  botaoPrincipalTitulo: {
    fontSize: 18,
    fontWeight: '800',
  },
  botaoPrincipalSubtitulo: {
    fontSize: 13,
  },
  linkSecundario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  linkSecundarioTexto: {
    fontSize: 14,
    fontWeight: '600',
  },
  secaoTituloLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  secaoTitulo: {
    fontSize: 16,
    fontWeight: '700',
  },
  linhaContato: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  contatoIconeCirculo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contatoInformacao: {
    flex: 1,
  },
  contatoNome: {
    fontSize: 15,
    fontWeight: '700',
  },
  contatoPapel: {
    fontSize: 13,
    marginTop: 2,
  },
  contatoAcoes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contatoBotaoAcao: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoAdicionar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    paddingVertical: 16,
  },
  botaoAdicionarTexto: {
    fontSize: 14,
    fontWeight: '700',
  },
  exercicioCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  exercicioTitulo: {
    fontSize: 16,
    fontWeight: '700',
  },
  exercicioDescricao: {
    textAlign: 'center',
    fontSize: 13,
  },
  exercicioBotao: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
  },
  exercicioBotaoTexto: {
    fontWeight: '700',
  },
});