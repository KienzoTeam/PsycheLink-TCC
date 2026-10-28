import css from './Sparkline.module.css';

type Props = { serie: readonly { total: number }[]; 'aria-label': string };

// Coordenadas internas 0 a 100: o SVG estica até o contêiner e a espessura (non-scaling-stroke) vem do CSS.
export function Sparkline({ serie, ...resto }: Props) {
  const totais = serie.map((ponto) => ponto.total);
  const menor = Math.min(...totais);
  const faixa = Math.max(...totais) - menor;
  const pontos = totais.map((total, i) => ({
    x: totais.length > 1 ? (i / (totais.length - 1)) * 100 : 100,
    y: faixa === 0 ? 50 : 100 - ((total - menor) / faixa) * 100,
  }));
  const fim = pontos.at(-1);
  if (!fim) return null;

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" className={css.sparkline} {...resto}>
      <polyline points={pontos.map(({ x, y }) => `${x},${y}`).join(' ')} className={css.linha} />
      {/* Segmento de comprimento zero com ponta redonda: vira um círculo sem distorcer com o esticar. */}
      <line x1={fim.x} y1={fim.y} x2={fim.x} y2={fim.y} className={css.anel} />
      <line x1={fim.x} y1={fim.y} x2={fim.x} y2={fim.y} className={css.ponto} />
    </svg>
  );
}
