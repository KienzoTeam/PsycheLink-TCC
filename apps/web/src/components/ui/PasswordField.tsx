import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { IconButton } from './IconButton';
import { MedidorSenha } from './MedidorSenha';
import { TextField, type CampoProps } from './TextField';

// `medidor`: só em senha nova (cadastro, troca, redefinição), nunca no login.
export function PasswordField({ medidor, ...props }: Omit<CampoProps, 'type'> & { medidor?: boolean }) {
  const [visivel, setVisivel] = useState(false);
  const campo = (
    <TextField
      {...props}
      type={visivel ? 'text' : 'password'}
      sufixo={
        <IconButton
          aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
          icone={visivel ? <EyeOff /> : <Eye />}
          onPress={() => setVisivel((atual) => !atual)}
        />
      }
    />
  );
  if (!medidor) return campo;
  return (
    <div>
      {campo}
      <MedidorSenha senha={props.value ?? ''} />
    </div>
  );
}
