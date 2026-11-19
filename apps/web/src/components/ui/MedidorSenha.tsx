import { Meter } from 'react-aria-components';
import { NOTA_MINIMA, useForcaSenha } from '../../lib/forcaSenha';
import css from './MedidorSenha.module.css';

const NIVEIS = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'];

export function MedidorSenha({ senha }: { senha: string }) {
  const forca = useForcaSenha(senha);
  if (!forca) return null;
  const { nota, aviso } = forca;
  return (
    <Meter
      aria-label="Força da senha"
      value={nota + 1}
      minValue={0}
      maxValue={5}
      valueLabel={NIVEIS[nota]}
      className={css.medidor}
      data-nivel={nota}
    >
      <div className={css.trilho}>
        <div className={css.barra} style={{ inlineSize: `${(nota + 1) * 20}%` }} />
      </div>
      <p className={css.texto} aria-live="polite">
        <strong>{NIVEIS[nota]}</strong>
        {nota < NOTA_MINIMA && ' · não será aceita'}
        {aviso && `. ${aviso}`}
      </p>
    </Meter>
  );
}
