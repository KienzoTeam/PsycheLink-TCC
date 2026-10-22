import { definirTema, useTema, type Tema } from '../../lib/tema';
import { SegmentedControl } from '../ui/SegmentedControl';

const OPCOES_TEMA = [
  { id: 'system', rotulo: 'Sistema' },
  { id: 'light', rotulo: 'Claro' },
  { id: 'dark', rotulo: 'Escuro' },
];

export function SeletorTema() {
  const tema = useTema();
  return <SegmentedControl aria-label="Tema da interface" opcoes={OPCOES_TEMA} valor={tema} onChange={(id) => definirTema(id as Tema)} />;
}
