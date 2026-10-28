import { useSyncExternalStore } from 'react';

export type Tema = 'system' | 'light' | 'dark';

// Mesma chave de public/tema-inicial.js, que aplica o tema antes da primeira pintura.
const CHAVE = 'psychelink_web_tema';

function lerTema(): Tema {
  try {
    const salvo = localStorage.getItem(CHAVE);
    return salvo === 'light' || salvo === 'dark' ? salvo : 'system';
  } catch {
    return 'system';
  }
}

let atual = lerTema();
const ouvintes = new Set<() => void>();
document.documentElement.dataset.theme = atual;

export function definirTema(tema: Tema) {
  atual = tema;
  document.documentElement.dataset.theme = tema;
  try {
    localStorage.setItem(CHAVE, tema);
  } catch {
    // Sem persistência: o tema ainda vale para esta sessão.
  }
  ouvintes.forEach((ouvinte) => ouvinte());
}

export const useTema = () =>
  useSyncExternalStore(
    (ouvinte) => {
      ouvintes.add(ouvinte);
      return () => ouvintes.delete(ouvinte);
    },
    () => atual,
  );
