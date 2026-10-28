import { useRef } from 'react';
import {
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  type DateValue,
} from 'react-aria-components';
import { toCalendarDate, type CalendarDate } from '@internationalized/date';
import { plural } from '../../lib/formatar';
import type { Consulta } from '../../lib/psicologoApi';
import { useCompacto } from '../../lib/useCompacto';
import { diaDoInstante } from './agenda';
import css from './Calendario.module.css';

type Props = {
  dia: CalendarDate;
  consultas: Consulta[];
  onFoco: (dia: CalendarDate) => void;
  onDia: (dia: CalendarDate) => void;
};

export function VisaoMes({ dia, consultas, onFoco, onDia }: Props) {
  const compacto = useCompacto();
  // Escolher um dia dispara, logo depois, um evento de foco no mesmo dia: sem este aviso ele desfaria a troca para a visão Dia.
  const escolheu = useRef(false);
  // Cancelada e remarcada não ocupam o dia: só entram na contagem as que acontecem.
  const contagem = new Map<string, number>();
  for (const c of consultas) {
    if (c.status === 'agendada' || c.status === 'concluida') {
      const chave = diaDoInstante(c.inicio).toString();
      contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
    }
  }

  return (
    <Calendar
      aria-label="Consultas do mês"
      className={css.mes}
      value={null}
      focusedValue={dia}
      onFocusChange={(foco: DateValue) => !escolheu.current && onFoco(toCalendarDate(foco))}
      onChange={(escolhido: DateValue) => {
        escolheu.current = true;
        onDia(toCalendarDate(escolhido));
      }}
    >
      <CalendarGrid weekdayStyle="short" className={css.gradeMes}>
        <CalendarGridHeader>{(nome) => <CalendarHeaderCell className={css.diaSemanaMes}>{nome}</CalendarHeaderCell>}</CalendarGridHeader>
        <CalendarGridBody>
          {(data) => {
            const quantidade = contagem.get(data.toString()) ?? 0;
            return (
              <CalendarCell date={data} className={css.celulaMes}>
                {({ formattedDate }) => (
                  <>
                    <span className={css.numeroMes}>{formattedDate}</span>
                    {quantidade > 0 && (
                      <span className={css.contagem}>{compacto ? quantidade : plural(quantidade, 'consulta', 'consultas')}</span>
                    )}
                  </>
                )}
              </CalendarCell>
            );
          }}
        </CalendarGridBody>
      </CalendarGrid>
    </Calendar>
  );
}
