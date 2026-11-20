import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import * as comum from '@zxcvbn-ts/language-common';
import * as ptBr from '@zxcvbn-ts/language-pt-br';

// Estimativa de força (zxcvbn): pega senhas comuns, nomes, datas e sequências de teclado em vez de
// exigir símbolo/maiúscula. Nota de 0 a 4; abaixo de NOTA_MINIMA a senha é recusada.
export type Forca = { nota: number; aviso?: string };

export const NOTA_MINIMA = 2;

// "Variação de senha comum" (Senha@123, Brasil@2024, S3nh@2024): tirando até 6 caracteres do fim,
// com ou sem leet, sobra uma senha, palavra ou nome comum de 4+ letras. Faz o papel da opção
// useLevenshteinDistance do zxcvbn, que comparava com o dicionário inteiro e custava ~10x mais.
// Mesma regra em apps/server, apps/web e apps/mobile (lib/forcaSenha.ts).
const LEET: Record<string, string> = { '@': 'a', '4': 'a', '3': 'e', '1': 'i', '!': 'i', '0': 'o', '$': 's', '5': 's', '7': 't' };
const AVISO_VARIACAO = 'Parece uma senha comum com números ou símbolos no fim.';

type Comum = typeof import('@zxcvbn-ts/language-common');
type PtBr = typeof import('@zxcvbn-ts/language-pt-br');

function criarAvaliador(comum: Comum, ptBr: PtBr) {
  const dicionarios = { ...comum.dictionary, ...ptBr.dictionary };
  const zxcvbn = new ZxcvbnFactory({ dictionary: dicionarios, graphs: comum.adjacencyGraphs, translations: ptBr.translations });
  const comuns = new Set([
    ...dicionarios['passwords-common'],
    ...dicionarios['commonWords-pt-br'].slice(0, 5000),
    ...dicionarios['firstnames-pt-br'],
  ]);
  const desleet = (s: string) => [...s].map((c) => LEET[c] ?? c).join('');
  const variacaoComum = (senha: string) => {
    const s = senha.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (let corte = 0; corte <= 6 && s.length - corte >= 4; corte++) {
      const base = s.slice(0, s.length - corte);
      if (comuns.has(base) || comuns.has(desleet(base))) return true;
    }
    return false;
  };
  return (senha: string): Forca => {
    const { score, feedback } = zxcvbn.check(senha);
    const aviso = feedback.warning ?? feedback.suggestions[0];
    if (!variacaoComum(senha)) return { nota: score, aviso };
    return { nota: Math.min(score, 1), aviso: score > 1 || !aviso ? AVISO_VARIACAO : aviso };
  };
}

export const avaliarSenha = criarAvaliador(comum, ptBr);
