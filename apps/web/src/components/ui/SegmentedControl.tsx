import { SelectionIndicator, ToggleButton, ToggleButtonGroup } from 'react-aria-components';
import css from './SegmentedControl.module.css';

type Props = {
  'aria-label': string;
  opcoes: ReadonlyArray<{ id: string; rotulo: string }>;
  valor: string;
  onChange: (id: string) => void;
};

export function SegmentedControl({ opcoes, valor, onChange, ...resto }: Props) {
  return (
    <ToggleButtonGroup
      {...resto}
      className={css.grupo}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[valor]}
      onSelectionChange={(chaves) => {
        const [id] = chaves;
        if (id !== undefined) onChange(String(id));
      }}
    >
      {opcoes.map((opcao) => (
        <ToggleButton key={opcao.id} id={opcao.id} className={css.opcao}>
          <SelectionIndicator className={css.indicador} />
          <span className={css.rotulo}>{opcao.rotulo}</span>
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
