import { useLayoutEffect, useRef, useState } from 'react';
import { cx } from '../../lib/cx';
import css from './GraficoLinhas.module.css';

// Geometria interna do SVG, em px: o CSS alcança traço, cor e fonte, mas não margens nem raios.
const MARGEM = { topo: 20, direita: 80, base: 28, esquerda: 36 };
const RAIO_MARCADOR = 4;
const ESPACO_MIN_ROTULO_X = 64;
const ESPACO_MIN_NOME_Y = 14;
const DESLOCAMENTO_TEXTO = 8;
const MAX_PONTOS_COM_MARCADOR = 31;

export type Serie = {
  nome: string;
  valores: ReadonlyArray<number | null>;
  // Tracejado e quadrado distinguem a série sem depender da cor (impressão em preto e branco).
  tracejada?: boolean;
  quadrada?: boolean;
};

type Props = {
  'aria-label': string;
  rotulos: readonly string[];
  series: readonly Serie[];
  dominio: readonly [number, number];
  marcas: readonly number[];
  valoresNosPontos?: boolean;
};

// O SVG usa os pixels reais do contêiner: o texto fica no tamanho do token em qualquer largura.
function useMedidas() {
  const ref = useRef<HTMLDivElement>(null);
  const [medidas, setMedidas] = useState({ largura: 0, altura: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => setMedidas({ largura: el.clientWidth, altura: el.clientHeight });
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, []);
  return [ref, medidas] as const;
}

export function GraficoLinhas({ rotulos, series, dominio, marcas, valoresNosPontos, ...resto }: Props) {
  const [ref, { largura, altura }] = useMedidas();
  const [minimo, maximo] = dominio;
  const n = rotulos.length;
  const areaL = largura - MARGEM.esquerda - MARGEM.direita;
  const areaA = altura - MARGEM.topo - MARGEM.base;
  const x = (i: number) => MARGEM.esquerda + (n === 1 ? areaL / 2 : (i * areaL) / (n - 1));
  const y = (v: number) => MARGEM.topo + (1 - (v - minimo) / (maximo - minimo)) * areaA;
  const passo = n > 1 ? Math.max(1, Math.ceil(ESPACO_MIN_ROTULO_X / (areaL / (n - 1)))) : 1;
  const comMarcador = n <= MAX_PONTOS_COM_MARCADOR;

  // Nomes diretos no fim de cada série, afastados quando as linhas terminam juntas.
  const nomes = series
    .map((serie, s) => {
      const i = serie.valores.findLastIndex((v) => v !== null);
      return i < 0 ? null : { s, nome: serie.nome, x: x(i), y: y(serie.valores[i]!) };
    })
    .filter((nome) => nome !== null)
    .sort((a, b) => a.y - b.y);
  nomes.forEach((nome, k) => {
    const anterior = nomes[k - 1];
    if (anterior && nome.y - anterior.y < ESPACO_MIN_NOME_Y) nome.y = anterior.y + ESPACO_MIN_NOME_Y;
  });

  return (
    <div ref={ref} className={css.raiz}>
      {largura > 0 && (
        <svg role="img" width={largura} height={altura} className={css.svg} {...resto}>
          {marcas.map((marca) => (
            <g key={marca}>
              <line x1={MARGEM.esquerda} x2={largura - MARGEM.direita} y1={y(marca)} y2={y(marca)} className={css.grade} />
              <text x={MARGEM.esquerda - DESLOCAMENTO_TEXTO} y={y(marca)} className={cx(css.eixo, css.eixoY)}>
                {marca}
              </text>
            </g>
          ))}
          {rotulos.map((rotulo, i) =>
            i % passo === 0 ? (
              <text key={i} x={x(i)} y={altura - DESLOCAMENTO_TEXTO} className={cx(css.eixo, css.eixoX)}>
                {rotulo}
              </text>
            ) : null,
          )}
          {series.map((serie, s) => {
            const trechos: string[][] = [[]];
            serie.valores.forEach((v, i) => {
              if (v === null) trechos.push([]);
              else trechos.at(-1)!.push(`${x(i)},${y(v)}`);
            });
            const ultimo = serie.valores.findLastIndex((v) => v !== null);
            return (
              <g key={serie.nome} className={css[`serie${s % 2}`]}>
                {trechos.map(
                  (pontos, t) =>
                    pontos.length > 1 && (
                      <polyline key={t} points={pontos.join(' ')} className={cx(css.linha, serie.tracejada && css.tracejada)} />
                    ),
                )}
                {serie.valores.map((v, i) => {
                  if (v === null || (!comMarcador && i !== ultimo)) return null;
                  const titulo = <title>{`${serie.nome}, ${rotulos[i]}: ${v}`}</title>;
                  return serie.quadrada ? (
                    <rect key={i} x={x(i) - RAIO_MARCADOR} y={y(v) - RAIO_MARCADOR} width={2 * RAIO_MARCADOR} height={2 * RAIO_MARCADOR} className={css.marcador}>
                      {titulo}
                    </rect>
                  ) : (
                    <circle key={i} cx={x(i)} cy={y(v)} r={RAIO_MARCADOR} className={css.marcador}>
                      {titulo}
                    </circle>
                  );
                })}
                {valoresNosPontos &&
                  serie.valores.map((v, i) =>
                    v === null ? null : (
                      <text key={i} x={x(i)} y={y(v) - 2 * RAIO_MARCADOR} className={css.valor}>
                        {v}
                      </text>
                    ),
                  )}
              </g>
            );
          })}
          {nomes.map((nome) => (
            <text key={nome.nome} x={nome.x + 2 * RAIO_MARCADOR} y={nome.y} className={css.nome}>
              {nome.nome}
            </text>
          ))}
        </svg>
      )}
    </div>
  );
}
