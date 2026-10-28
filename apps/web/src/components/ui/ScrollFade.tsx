import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { cx } from '../../lib/cx';
import css from './ScrollFade.module.css';

type Props = {
  'aria-label': string;
  className?: string;
  children: ReactNode;
};

// Lista rolável com um véu desfocado no fim enquanto houver conteúdo abaixo.
export function ScrollFade({ className, children, ...resto }: Props) {
  const area = useRef<HTMLDivElement>(null);
  const [temMais, setTemMais] = useState(false);

  const medir = useCallback(() => {
    const el = area.current;
    if (el) setTemMais(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
  }, []);

  // Sem deps de propósito: depois de cada render o conteúdo pode ter mudado.
  useEffect(medir);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, [medir]);

  return (
    <div className={cx(css.raiz, className)}>
      <div ref={area} role="region" tabIndex={0} onScroll={medir} className={css.area} {...resto}>
        {children}
      </div>
      <div aria-hidden className={css.veu} data-visivel={temMais} />
    </div>
  );
}
