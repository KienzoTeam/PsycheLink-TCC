import { useEffect, useRef } from "react";

/**
 * Reinicia uma animação CSS (via classList) sempre que `value` muda, sem
 * desmontar/remontar o elemento nem seus filhos — diferente de usar `key`,
 * que forçaria React a recriar toda a subárvore (o que quebraria, por
 * exemplo, a transição de altura de um <Collapse> filho).
 *
 * Na primeira renderização não faz nada: a animação de entrada inicial já
 * roda sozinha via CSS (a classe já vem aplicada desde o primeiro render).
 */
export function useReplayOnChange<T>(value: T, animationClassName: string) {
  const ref = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const el = ref.current;
    if (!el) return;

    el.classList.remove(animationClassName);
    void el.offsetWidth; // força reflow para permitir reiniciar a animação
    el.classList.add(animationClassName);
  }, [value, animationClassName]);

  return ref;
}
