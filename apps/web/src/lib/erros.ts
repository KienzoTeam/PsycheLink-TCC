import { isAxiosError } from 'axios';

/** Mensagem exibível vinda do servidor (campo `error`), ou um texto padrão. */
export function mensagemDeErro(erro: unknown, padrao = 'Não foi possível concluir a operação.'): string {
  if (isAxiosError(erro)) {
    if (!erro.response) return 'Não foi possível falar com o servidor. Tente de novo em instantes.';
    const dados = erro.response.data as { error?: string } | undefined;
    if (dados?.error) return dados.error;
    // O limitador de requisições responde 429 em texto puro, sem o campo `error`.
    if (erro.response.status === 429) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
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
