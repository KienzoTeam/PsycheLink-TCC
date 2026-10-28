import { useSyncExternalStore } from 'react';

// Único lugar do breakpoint: o CSS lê o resultado por data-compacto.
const COMPACTO = '(max-width: 819.98px)';

export function useCompacto() {
  return useSyncExternalStore(
    (aviso) => {
      const consulta = window.matchMedia(COMPACTO);
      consulta.addEventListener('change', aviso);
      return () => consulta.removeEventListener('change', aviso);
    },
    () => window.matchMedia(COMPACTO).matches,
  );
}
