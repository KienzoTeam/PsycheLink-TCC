import css from './ScoreBruto.module.css';

// Pontuação bruta do instrumento: número e escala, sem rótulo de severidade.
export function ScoreBruto({ valor, maximo }: { valor: number; maximo: number }) {
  return (
    <p className={css.score}>
      <span className={css.valor}>{valor}</span>
      <span className={css.de}>de {maximo}</span>
    </p>
  );
}
