import { TextField } from '../../components/ui/TextField';
import { lerDia } from '../../lib/periodo';
import { instanteDe, MAX_DURACAO, MIN_DURACAO, PASSO_DURACAO } from './agenda';
import css from './Calendario.module.css';

export type Horario = { dia: string; hora: string; minutos: string };
type Erros = Partial<Record<keyof Horario, string>>;

export function validarHorario({ dia, hora, minutos }: Horario): Erros {
  const duracao = Number(minutos);
  return {
    ...(lerDia(dia) === null && { dia: 'Informe a data.' }),
    ...(!/^\d{2}:\d{2}$/.test(hora) && { hora: 'Informe o horário de início.' }),
    ...(!(Number.isInteger(duracao) && duracao >= MIN_DURACAO && duracao <= MAX_DURACAO && duracao % PASSO_DURACAO === 0) && {
      minutos: `Informe de ${MIN_DURACAO} a ${MAX_DURACAO} minutos, em passos de ${PASSO_DURACAO}.`,
    }),
  };
}

export const intervaloDe = ({ dia, hora, minutos }: Horario) => ({
  inicio: instanteDe(dia, hora),
  fim: instanteDe(dia, hora, Number(minutos)),
});

type Props = { valor: Horario; onChange: (horario: Horario) => void; erros: Erros };

export function CamposHorario({ valor, onChange, erros }: Props) {
  return (
    <div className={css.campos}>
      <TextField rotulo="Data" type="date" value={valor.dia} onChange={(dia) => onChange({ ...valor, dia })} erro={erros.dia} />
      <TextField rotulo="Início" type="time" value={valor.hora} onChange={(hora) => onChange({ ...valor, hora })} erro={erros.hora} />
      <TextField
        rotulo="Duração, em minutos"
        type="number"
        min={MIN_DURACAO}
        max={MAX_DURACAO}
        step={PASSO_DURACAO}
        value={valor.minutos}
        onChange={(minutos) => onChange({ ...valor, minutos })}
        erro={erros.minutos}
      />
    </div>
  );
}
