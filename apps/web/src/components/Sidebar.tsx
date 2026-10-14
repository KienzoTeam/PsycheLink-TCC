import type { CSSProperties } from 'react';
import { NavLink } from 'react-router';
import { brand } from '../theme';
import { Icon } from './Icon';

export const NAV = [
  { id: 'inicio', rotulo: 'Início' },
  { id: 'pacientes', rotulo: 'Pacientes' },
  { id: 'checkins', rotulo: 'Check-ins' },
  { id: 'chats', rotulo: 'Chats' },
  { id: 'relatorios', rotulo: 'Relatórios' },
  { id: 'escalas', rotulo: 'Escalas' },
  { id: 'calendario', rotulo: 'Calendário' },
  { id: 'vinculo', rotulo: 'Vínculo' },
  { id: 'auditoria', rotulo: 'Auditoria' },
] as const;

export function Sidebar({ colapsada, onToggle }: { colapsada: boolean; onToggle: () => void }) {
  return (
    <aside
      style={{
        width: colapsada ? 72 : 220,
        transition: 'width 200ms ease',
        borderRight: `1px solid ${brand.outline}`,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        background: brand.surface,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <button
        onClick={onToggle}
        aria-label={colapsada ? 'Expandir menu' : 'Colapsar menu'}
        style={{ alignSelf: 'flex-end', border: 0, background: 'transparent', color: brand.subtext }}
      >
        {colapsada ? '|>' : '<|'}
      </button>
      {NAV.map((item) => (
        <NavLink
          key={item.id}
          to={`/${item.id}`}
          style={({ isActive }): CSSProperties => ({
            display: 'flex',
            flexDirection: colapsada ? 'column' : 'row',
            alignItems: 'center',
            gap: colapsada ? 2 : 10,
            padding: colapsada ? '10px 4px' : '10px 12px',
            borderRadius: brand.radius.md,
            background: isActive ? brand.primary : 'transparent',
            color: isActive ? '#fff' : brand.text,
            fontSize: colapsada ? 10 : 14,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          })}
        >
          <Icon name={item.id} size={colapsada ? 22 : 20} />
          {colapsada ? item.rotulo.split(' ')[0] : item.rotulo}
        </NavLink>
      ))}
    </aside>
  );
}
