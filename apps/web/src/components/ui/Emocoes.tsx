import { emocaoDe, rotuloEmocao } from '../../lib/rotulos';
import { Chip } from './Chip';
import css from './Emocoes.module.css';

export function Emocoes({ emocoes }: { emocoes: readonly string[] | null }) {
  if (!emocoes?.length) return <span className={css.nenhuma}>Sem emoção registrada</span>;
  return (
    <ul className={css.lista} aria-label="Emoções">
      {emocoes.map((emocao) => (
        <li key={emocao}>
          <Chip emocao={emocaoDe(emocao)}>{rotuloEmocao(emocao)}</Chip>
        </li>
      ))}
    </ul>
  );
}
