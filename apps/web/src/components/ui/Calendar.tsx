import {
  Calendar as CalendarioAria,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  Heading,
  type CalendarProps,
  type DateValue,
} from 'react-aria-components';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from './IconButton';
import css from './Calendar.module.css';

// Cabeçalho e grade valem para Calendar e RangeCalendar: o RAC fornece o estado por contexto.
export function CorpoCalendario() {
  return (
    <>
      <header className={css.cabecalho}>
        <IconButton slot="previous" aria-label="Mês anterior" icone={<ChevronLeft />} />
        <Heading className={css.titulo} />
        <IconButton slot="next" aria-label="Próximo mês" icone={<ChevronRight />} />
      </header>
      <CalendarGrid className={css.grade}>
        <CalendarGridHeader>
          {(dia) => <CalendarHeaderCell className={css.diaSemana}>{dia}</CalendarHeaderCell>}
        </CalendarGridHeader>
        <CalendarGridBody>{(data) => <CalendarCell date={data} className={css.celula} />}</CalendarGridBody>
      </CalendarGrid>
    </>
  );
}

export function Calendar(props: Omit<CalendarProps<DateValue>, 'className' | 'style' | 'children'>) {
  return (
    <CalendarioAria {...props} className={css.calendario}>
      <CorpoCalendario />
    </CalendarioAria>
  );
}
