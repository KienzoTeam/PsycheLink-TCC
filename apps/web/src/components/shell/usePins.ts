import { useSyncExternalStore } from 'react';
import { ITENS_NAV, PINS_PADRAO } from './itensNav';

const CHAVE = 'psychelink_web_pins';

function lerPins(): string[] {
  try {
    const salvo: unknown = JSON.parse(localStorage.getItem(CHAVE) ?? 'null');
    if (Array.isArray(salvo)) {
      const validos = ITENS_NAV.filter((item) => salvo.includes(item.id)).map((item) => item.id);
      if (validos.length > 0) return validos;
    }
  } catch {
    // Valor ilegível ou sem acesso ao storage: volta ao padrão.
  }
  return PINS_PADRAO;
}

// Um só estado para a barra lateral e para a Minha área: mudar numa tela vale na outra.
let atuais = lerPins();
const ouvintes = new Set<() => void>();
const assinar = (ouvinte: () => void) => {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
};

function alternar(id: string) {
  const fixado = atuais.includes(id);
  if (fixado && atuais.length === 1) return;
  atuais = fixado ? atuais.filter((atual) => atual !== id) : [...atuais, id];
  try {
    localStorage.setItem(CHAVE, JSON.stringify(atuais));
  } catch {
    // Sem persistência: os pins valem para esta sessão.
  }
  ouvintes.forEach((ouvinte) => ouvinte());
}

export const usePins = () => ({ fixados: useSyncExternalStore(assinar, () => atuais), alternar });
