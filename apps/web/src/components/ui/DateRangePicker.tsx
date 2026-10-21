import {
  DateInput,
  DateRangePicker as PeriodoAria,
  DateSegment,
  Dialog,
  Group,
  Label,
  Popover,
  RangeCalendar,
  type DateValue,
  type RangeValue,
} from 'react-aria-components';
import { getLocalTimeZone, today } from '@internationalized/date';
import { CalendarDays } from 'lucide-react';
import { cx } from '../../lib/cx';
import { ChipFiltro } from './Chip';
import { CorpoCalendario } from './Calendar';
import { IconButton } from './IconButton';
import calendario from './Calendar.module.css';
import css from './DateRangePicker.module.css';

export type Periodo = RangeValue<DateValue>;

const PRESETS = [7, 30, 90] as const;

// Os últimos N dias contam o dia de hoje.
function ultimosDias(dias: number): Periodo {
  const hoje = today(getLocalTimeZone());
  return { start: hoje.subtract({ days: dias - 1 }), end: hoje };
}

function coincide(periodo: Periodo | null, dias: number) {
  const alvo = ultimosDias(dias);
  return periodo !== null && periodo.start.compare(alvo.start) === 0 && periodo.end.compare(alvo.end) === 0;
}

type Props = {
  valor: Periodo | null;
  onChange: (periodo: Periodo | null) => void;
};

export function DateRangePicker({ valor, onChange }: Props) {
  return (
    <div className={css.raiz}>
      <div role="group" aria-label="Períodos rápidos" className={css.presets}>
        {PRESETS.map((dias) => (
          <ChipFiltro key={dias} isSelected={coincide(valor, dias)} onChange={() => onChange(ultimosDias(dias))}>
            {`${dias} dias`}
          </ChipFiltro>
        ))}
      </div>
      <PeriodoAria value={valor} onChange={onChange} maxValue={today(getLocalTimeZone())} className={css.campo}>
        <Label className={css.rotulo}>Período</Label>
        <Group className={css.grupo}>
          <DateInput slot="start" className={css.data}>
            {(segmento) => <DateSegment segment={segmento} className={css.segmento} />}
          </DateInput>
          <span aria-hidden className={css.ate}>
            até
          </span>
          <DateInput slot="end" className={css.data}>
            {(segmento) => <DateSegment segment={segmento} className={css.segmento} />}
          </DateInput>
          <IconButton aria-label="Abrir calendário" icone={<CalendarDays />} />
        </Group>
        <Popover className={css.popover}>
          <Dialog className={css.dialogo}>
            <RangeCalendar className={cx(calendario.calendario, calendario.intervalo)}>
              <CorpoCalendario />
            </RangeCalendar>
          </Dialog>
        </Popover>
      </PeriodoAria>
    </div>
  );
}
