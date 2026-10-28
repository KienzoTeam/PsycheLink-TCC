import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import { PasswordField } from '../../components/ui/PasswordField';
import { TextField, type CampoProps } from '../../components/ui/TextField';

type Props<T extends FieldValues> = Omit<CampoProps, 'name' | 'value' | 'onChange' | 'onBlur' | 'inputRef' | 'erro'> & {
  control: Control<T>;
  nome: Path<T>;
  senha?: boolean;
  formatar?: (valor: string) => string;
};

// Liga um campo do design system ao react-hook-form; o inputRef permite focar o primeiro campo inválido.
export function CampoForm<T extends FieldValues>({ control, nome, senha, formatar, ...resto }: Props<T>) {
  const { field, fieldState } = useController({ control, name: nome });
  const props = {
    ...resto,
    name: field.name,
    value: String(field.value ?? ''),
    onChange: (valor: string) => field.onChange(formatar ? formatar(valor) : valor),
    onBlur: field.onBlur,
    inputRef: field.ref,
    erro: fieldState.error?.message,
  };
  return senha ? <PasswordField {...props} /> : <TextField {...props} />;
}
