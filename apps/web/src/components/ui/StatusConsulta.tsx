import { CalendarClock, CircleCheck, CircleX, Repeat, type LucideIcon } from 'lucide-react';
import type { StatusConsulta as Status } from '../../lib/psicologoApi';
import { STATUS_CONSULTA } from '../../lib/rotulos';
import css from './StatusConsulta.module.css';

// Cada status tem ícone próprio além do texto: a distinção nunca depende só da cor.
const ICONES: Record<Status, LucideIcon> = {
  agendada: CalendarClock,
  concluida: CircleCheck,
  cancelada: CircleX,
  remarcada: Repeat,
};

export function StatusConsulta({ status }: { status: Status }) {
  const Icone = ICONES[status];
  return (
    <span className={css.status}>
      <Icone aria-hidden />
      {STATUS_CONSULTA[status]}
    </span>
  );
}
