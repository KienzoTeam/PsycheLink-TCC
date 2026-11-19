import { useEffect, useState } from 'react';

export type Forca = { nota: number; aviso?: string };

// Mesma regra do server (apps/server/src/lib/forcaSenha.ts): nota abaixo de 2 é recusada no envio.
export const NOTA_MINIMA = 2;

// O zxcvbn e os dicionários pesam ~1 MB: só carregam quando alguém digita uma senha nova.
let avaliador: Promise<(senha: string) => Forca> | null = null;
const carregar = () =>
  (avaliador ??= Promise.all([
    import('@zxcvbn-ts/core'),
    import('@zxcvbn-ts/language-common'),
    import('@zxcvbn-ts/language-pt-br'),
  ])
    .then(([{ ZxcvbnFactory }, comum, ptBr]) => {
      const zxcvbn = new ZxcvbnFactory({
        dictionary: { ...comum.dictionary, ...ptBr.dictionary },
        graphs: comum.adjacencyGraphs,
        translations: ptBr.translations,
        useLevenshteinDistance: true,
      });
      return (senha: string) => {
        const { score, feedback } = zxcvbn.check(senha);
        return { nota: score, aviso: feedback.warning ?? feedback.suggestions[0] };
      };
    })
    .catch((erro: unknown) => {
      avaliador = null; // chunk que falhou (ex.: deploy novo) tenta de novo na próxima tecla
      throw erro;
    }));

export function useForcaSenha(senha: string): Forca | null {
  const [forca, setForca] = useState<Forca | null>(null);
  useEffect(() => {
    let ativo = true;
    // Espera a pessoa parar de digitar: a avaliação leva ~100 ms.
    const espera = setTimeout(() => {
      carregar()
        .then((avaliar) => ativo && setForca(avaliar(senha)))
        .catch(() => undefined);
    }, 150);
    return () => {
      ativo = false;
      clearTimeout(espera);
    };
  }, [senha]);
  return senha ? forca : null;
}
