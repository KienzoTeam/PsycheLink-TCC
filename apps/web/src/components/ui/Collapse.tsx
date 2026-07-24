import { useEffect, useState } from "react";

export interface CollapseProps {
  open: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Anima a altura de `children` entre 0 e o tamanho natural do conteúdo,
 * usando `grid-template-rows` (0fr <-> 1fr) — sem medir altura via JS
 * (ResizeObserver) e sem desmontar o conteúdo.
 *
 * O elemento permanece sempre montado no DOM: ao fechar, ele só encolhe
 * visualmente. Isso é o que permite os campos vizinhos se reorganizarem
 * suavemente (o formulário "empurra" ou "puxa" o espaço), em vez de
 * pular instantaneamente como acontecia com montagem/desmontagem condicional.
 *
 * Enquanto fechado, o conteúdo fica `inert` (não focável, fora da árvore
 * de acessibilidade) para que campos escondidos não sejam alcançados via Tab
 * nem lidos por leitores de tela.
 */
export function Collapse({ open, children, className }: CollapseProps) {
  // Na primeira renderização a transição fica desativada, para não animar
  // um campo que já nasce aberto (ex.: acessar /register diretamente).
  const [skipTransition, setSkipTransition] = useState(true);

  useEffect(() => {
    const id = requestAnimationFrame(() => setSkipTransition(false));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      inert={!open}
      aria-hidden={!open}
      className={`grid overflow-hidden ${
        skipTransition ? "" : "transition-[grid-template-rows,opacity] duration-500 ease-in-out-expo"
      } ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"} ${className ?? ""}`}
    >
      <div className="min-h-0">{children}</div>
    </div>
  );
}
