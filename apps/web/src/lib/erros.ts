import { isAxiosError } from 'axios';

/** Mensagem exibível vinda do servidor (campo `error`), ou um texto padrão. */
export function mensagemDeErro(erro: unknown, padrao = 'Não foi possível concluir a operação.'): string {
  if (isAxiosError(erro)) {
    const dados = erro.response?.data as { error?: string } | undefined;
    if (dados?.error) return dados.error;
  }
  return padrao;
}

/** Código de negócio retornado pelo servidor (ex.: EMAIL_NAO_VERIFICADO). */
export function codigoDeErro(erro: unknown): string | null {
  if (isAxiosError(erro)) {
    const dados = erro.response?.data as { codigo?: string } | undefined;
    return dados?.codigo ?? null;
  }
  return null;
}
