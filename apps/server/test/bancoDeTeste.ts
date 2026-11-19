// Devolve null se as URLs são de um banco de teste, ou o motivo de recusar a suíte. O motivo nunca
// repete a URL, o host nem a senha: só o nome do banco, que não é segredo.
export function motivoParaRecusar(
  urls: (string | undefined)[],
  hostsDaEquipe: string[],
): string | null {
  if (urls.some((url) => !url)) {
    return 'DATABASE_URL e DATABASE_URL_DIRETA precisam estar definidas.';
  }

  for (const url of urls as string[]) {
    let banco: URL;
    try {
      banco = new URL(url);
    } catch {
      return 'uma das URLs de banco não é válida.';
    }
    const nome = banco.pathname.slice(1);
    if (!nome.endsWith('_teste')) {
      return `o banco "${nome}" não termina em _teste.`;
    }
    if (hostsDaEquipe.includes(banco.hostname)) {
      return 'o host é o do banco da equipe (definido em .env).';
    }
  }
  return null;
}
