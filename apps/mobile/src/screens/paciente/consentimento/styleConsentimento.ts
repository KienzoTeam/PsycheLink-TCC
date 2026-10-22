import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  tela: {
    flex: 1,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  botaoVoltar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloCabecalho: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
  },
  conteudo: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  centralizado: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  textoCentral: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  botaoTentarDeNovo: {
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  textoTentarDeNovo: {
    fontSize: 15,
    fontWeight: '600',
  },
  cartao: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  psicologo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  psicologoIcone: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  psicologoTextos: {
    flex: 1,
    gap: 2,
  },
  psicologoNome: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
  },
  detalhe: {
    fontSize: 14,
    lineHeight: 20,
  },
  introducao: {
    fontSize: 15,
    lineHeight: 22,
  },
  linha: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  linhaTextos: {
    flex: 1,
    gap: 2,
  },
  rotulo: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  descricao: {
    fontSize: 14,
    lineHeight: 20,
  },
  divisor: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  tituloDiario: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  compartilhados: {
    gap: 12,
  },
  estadoDiario: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingBottom: 14,
    marginTop: -4,
  },
  atualizadoEm: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  feedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedbackTexto: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  botaoPerigo: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  botaoPerigoTexto: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'center',
  },
});
