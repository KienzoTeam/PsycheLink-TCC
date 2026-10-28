import {
  Button,
  FieldError,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select as SelectAria,
  SelectValue,
  Text,
  type SelectProps,
} from 'react-aria-components';
import { Check, ChevronDown, CircleAlert } from 'lucide-react';
import css from './Select.module.css';

type Props = Pick<SelectProps, 'isDisabled' | 'placeholder'> & {
  rotulo: string;
  opcoes: ReadonlyArray<{ id: string; rotulo: string }>;
  valor: string | null;
  onChange: (id: string) => void;
  descricao?: string;
  erro?: string;
};

export function Select({ rotulo, opcoes, valor, onChange, descricao, erro, ...resto }: Props) {
  return (
    <SelectAria
      {...resto}
      selectedKey={valor}
      onSelectionChange={(chave) => chave !== null && onChange(String(chave))}
      isInvalid={erro !== undefined}
      className={css.campo}
    >
      <Label className={css.rotulo}>{rotulo}</Label>
      <Button className={css.gatilho}>
        <SelectValue className={css.valor} />
        <ChevronDown aria-hidden />
      </Button>
      {descricao && (
        <Text slot="description" className={css.ajuda}>
          {descricao}
        </Text>
      )}
      <FieldError className={css.erro}>
        <CircleAlert aria-hidden />
        {erro}
      </FieldError>
      <Popover className={css.popover}>
        <ListBox className={css.lista}>
          {opcoes.map((opcao) => (
            <ListBoxItem key={opcao.id} id={opcao.id} textValue={opcao.rotulo} className={css.opcao}>
              {({ isSelected }) => (
                <>
                  {opcao.rotulo}
                  {isSelected && <Check aria-hidden />}
                </>
              )}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </SelectAria>
  );
}
