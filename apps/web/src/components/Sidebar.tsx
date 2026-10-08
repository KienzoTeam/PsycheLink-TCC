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

export type NavId = (typeof NAV)[number]['id'];

export function Sidebar({
  ativo, colapsada, onToggle, onNavegar,
}: {
  ativo: NavId;
  colapsada: boolean;
  onToggle: () => void;
  onNavegar: (id: NavId) => void;
}) {
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
      }}
    >
      <button
        onClick={onToggle}
        aria-label={colapsada ? 'Expandir menu' : 'Colapsar menu'}
        style={{ alignSelf: 'flex-end', border: 0, background: 'transparent', color: brand.subtext }}
      >
        {colapsada ? '|>' : '<|'}
      </button>
      {NAV.map((item) => {
        const ligado = item.id === ativo;
        const cor = ligado ? '#fff' : brand.text;
        return (
          <button
            key={item.id}
            onClick={() => onNavegar(item.id)}
            style={{
              display: 'flex',
              flexDirection: colapsada ? 'column' : 'row',
              alignItems: 'center',
              gap: colapsada ? 2 : 10,
              padding: colapsada ? '10px 4px' : '10px 12px',
              border: 0,
              borderRadius: brand.radius.md,
              background: ligado ? brand.primary : 'transparent',
              color: cor,
              fontSize: colapsada ? 10 : 14,
              whiteSpace: 'nowrap',
            }}
          >
            <Icon name={item.id} size={colapsada ? 22 : 20} />
            {colapsada ? item.rotulo.split(' ')[0] : item.rotulo}
          </button>
        );
      })}
    </aside>
  );
}
