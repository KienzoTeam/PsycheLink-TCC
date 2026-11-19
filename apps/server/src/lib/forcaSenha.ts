import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import { adjacencyGraphs, dictionary as dicionarioComum } from '@zxcvbn-ts/language-common';
import { dictionary as dicionarioPtBr, translations } from '@zxcvbn-ts/language-pt-br';

// Estimativa de força (zxcvbn): pega senhas comuns, nomes, datas e sequências de teclado em vez de
// exigir símbolo/maiúscula. Nota de 0 a 4; abaixo de NOTA_MINIMA a senha é recusada.
const zxcvbn = new ZxcvbnFactory({
  dictionary: { ...dicionarioComum, ...dicionarioPtBr },
  graphs: adjacencyGraphs,
  translations,
  // Pega variações de senhas comuns ("Senha@123" sai 3 sem isto, 1 com). Custa ~100 ms por senha,
  // só no cadastro e na troca de senha.
  useLevenshteinDistance: true,
});

export const NOTA_MINIMA = 2;

export const avaliarSenha = (senha: string) => zxcvbn.check(senha);
