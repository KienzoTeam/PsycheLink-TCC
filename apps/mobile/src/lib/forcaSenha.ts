import { useEffect, useState } from 'react';
import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import { adjacencyGraphs, dictionary as dicionarioComum } from '@zxcvbn-ts/language-common';
import { dictionary as dicionarioPtBr, translations } from '@zxcvbn-ts/language-pt-br';

export type Forca = { nota: number; aviso?: string };

// Mesma regra do server (apps/server/src/lib/forcaSenha.ts): nota abaixo de 2 é recusada no envio.
export const NOTA_MINIMA = 2;

// Import normal: no celular o bundle inteiro já está no aparelho, e o import() dinâmico quebra no
// Metro de desenvolvimento (Expo Go). O avaliador só é montado quando alguém digita uma senha nova.
let zxcvbn: ZxcvbnFactory | undefined;
function avaliar(senha: string): Forca {
  zxcvbn ??= new ZxcvbnFactory({
    dictionary: { ...dicionarioComum, ...dicionarioPtBr },
    graphs: adjacencyGraphs,
    translations,
    useLevenshteinDistance: true,
  });
  const { score, feedback } = zxcvbn.check(senha);
  return { nota: score, aviso: feedback.warning ?? feedback.suggestions[0] };
}

export function useForcaSenha(senha: string): Forca | null {
  const [forca, setForca] = useState<Forca | null>(null);
  useEffect(() => {
    if (!senha) return;
    // Espera a pessoa parar de digitar: a avaliação leva ~100 ms (mais no celular).
    const espera = setTimeout(() => setForca(avaliar(senha)), 250);
    return () => clearTimeout(espera);
  }, [senha]);
  return senha ? forca : null;
}
