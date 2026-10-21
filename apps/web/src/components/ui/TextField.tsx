import type { ReactNode, Ref } from 'react';
import {
  FieldError,
  Input,
  Label,
  Text,
  TextField as CampoAria,
  type TextFieldProps,
} from 'react-aria-components';
import { CircleAlert } from 'lucide-react';
import css from './TextField.module.css';

export type CampoProps = Omit<TextFieldProps, 'className' | 'style' | 'children' | 'isInvalid'> & {
  rotulo: string;
  descricao?: string;
  erro?: string;
  inputRef?: Ref<HTMLInputElement>;
};

export function TextField({ rotulo, descricao, erro, inputRef, sufixo, ...resto }: CampoProps & { sufixo?: ReactNode }) {
  return (
    <CampoAria {...resto} isInvalid={erro !== undefined} className={css.campo}>
      <Label className={css.rotulo}>{rotulo}</Label>
      <div className={css.caixa}>
        <Input ref={inputRef} className={css.entrada} />
        {sufixo}
      </div>
      {descricao && (
        <Text slot="description" className={css.ajuda}>
          {descricao}
        </Text>
      )}
      <FieldError className={css.erro}>
        <CircleAlert aria-hidden />
        {erro}
      </FieldError>
    </CampoAria>
  );
}
