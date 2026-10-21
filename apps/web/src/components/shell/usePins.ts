import { useState } from 'react';
import { ITENS_NAV, PINS_PADRAO } from './itensNav';

const CHAVE = 'psychelink_web_pins';

function lerPins(): string[] {
  try {
    const salvo: unknown = JSON.parse(localStorage.getItem(CHAVE) ?? 'null');
    if (Array.isArray(salvo)) {
      const validos = ITENS_NAV.filter((item) => !item.emBreve && salvo.includes(item.id)).map((item) => item.id);
      if (validos.length > 0) return validos;
    }
  } catch {
    // Valor ilegível ou sem acesso ao storage: volta ao padrão.
  }
  return PINS_PADRAO;
}

export function usePins() {
  const [fixados, setFixados] = useState(lerPins);

  function alternar(id: string) {
    const fixado = fixados.includes(id);
    if (fixado && fixados.length === 1) return;
    const novos = fixado ? fixados.filter((atual) => atual !== id) : [...fixados, id];
    setFixados(novos);
    try {
      localStorage.setItem(CHAVE, JSON.stringify(novos));
    } catch {
      // Sem persistência: os pins valem para esta sessão.
    }
  }

  return { fixados, alternar };
}
