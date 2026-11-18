import {
  CalendarDays,
  ClipboardList,
  FileText,
  House,
  Link2,
  MapPinCheck,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type ItemNav = { id: string; rotulo: string; icone: LucideIcon };

export const ITENS_NAV: readonly ItemNav[] = [
  { id: 'inicio', rotulo: 'Início', icone: House },
  { id: 'pacientes', rotulo: 'Pacientes', icone: Users },
  { id: 'checkins', rotulo: 'Check-ins', icone: MapPinCheck },
  { id: 'relatorios', rotulo: 'Relatórios', icone: FileText },
  { id: 'escalas', rotulo: 'Escalas', icone: ClipboardList },
  { id: 'calendario', rotulo: 'Calendário', icone: CalendarDays },
  { id: 'vinculo', rotulo: 'Vínculo', icone: Link2 },
  { id: 'auditoria', rotulo: 'Auditoria', icone: ShieldCheck },
];

export const PINS_PADRAO = ['inicio', 'pacientes', 'escalas', 'calendario'];
