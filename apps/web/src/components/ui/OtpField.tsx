import { useId, useRef, type ClipboardEvent, type ChangeEvent, type KeyboardEvent } from 'react';
import { CircleAlert } from 'lucide-react';
import css from './OtpField.module.css';

const DIGITOS = 6;
const POSICOES = Array.from({ length: DIGITOS }, (_, i) => i);

type Props = {
  rotulo: string;
  valor: string;
  onChange: (valor: string) => void;
  erro?: string;
  isDisabled?: boolean;
};

export function OtpField({ rotulo, valor, onChange, erro, isDisabled }: Props) {
  const idRotulo = useId();
  const idErro = useId();
  const caixas = useRef<Array<HTMLInputElement | null>>([]);

  const focar = (posicao: number) => caixas.current[Math.min(Math.max(posicao, 0), DIGITOS - 1)]?.focus();

  // Escreve os dígitos a partir da posição; nunca deixa lacuna antes do valor atual.
  function inserir(posicao: number, digitos: string) {
    const inicio = digitos.length >= DIGITOS ? 0 : Math.min(posicao, valor.length);
    onChange((valor.slice(0, inicio) + digitos + valor.slice(inicio + digitos.length)).slice(0, DIGITOS));
    focar(inicio + digitos.length);
  }

  function aoDigitar(posicao: number, evento: ChangeEvent<HTMLInputElement>) {
    const digitos = evento.target.value.replace(/\D/g, '');
    const atual = valor[posicao];
    // Caixa já preenchida: o texto traz o dígito antigo mais o novo.
    const novos = atual && digitos.length === 2 ? digitos.replace(atual, '') : digitos;
    if (novos) inserir(posicao, novos);
  }

  function aoPressionar(posicao: number, evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === 'Backspace') {
      evento.preventDefault();
      const base = Math.min(posicao, valor.length);
      const alvo = valor[base] ? base : base - 1;
      if (alvo < 0) return;
      onChange(valor.slice(0, alvo) + valor.slice(alvo + 1));
      focar(alvo);
    } else if (evento.key === 'ArrowLeft') {
      evento.preventDefault();
      focar(posicao - 1);
    } else if (evento.key === 'ArrowRight') {
      evento.preventDefault();
      focar(posicao + 1);
    }
  }

  function aoColar(posicao: number, evento: ClipboardEvent<HTMLInputElement>) {
    evento.preventDefault();
    const digitos = evento.clipboardData.getData('text').replace(/\D/g, '');
    if (digitos) inserir(posicao, digitos);
  }

  return (
    <div role="group" aria-labelledby={idRotulo} className={css.campo}>
      <span id={idRotulo} className={css.rotulo}>
        {rotulo}
      </span>
      <div className={css.caixas}>
        {POSICOES.map((posicao) => (
          <input
            key={posicao}
            ref={(elemento) => {
              caixas.current[posicao] = elemento;
            }}
            className={css.caixa}
            value={valor[posicao] ?? ''}
            onChange={(evento) => aoDigitar(posicao, evento)}
            onKeyDown={(evento) => aoPressionar(posicao, evento)}
            onPaste={(evento) => aoColar(posicao, evento)}
            onFocus={(evento) => evento.target.select()}
            inputMode="numeric"
            autoComplete={posicao === 0 ? 'one-time-code' : 'off'}
            aria-label={`Dígito ${posicao + 1} de ${DIGITOS}`}
            aria-invalid={erro !== undefined || undefined}
            aria-describedby={erro !== undefined ? idErro : undefined}
            disabled={isDisabled}
          />
        ))}
      </div>
      {erro !== undefined && (
        <p id={idErro} className={css.erro}>
          <CircleAlert aria-hidden />
          {erro}
        </p>
      )}
    </div>
  );
}
