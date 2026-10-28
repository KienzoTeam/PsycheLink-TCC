import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { IconButton } from './IconButton';
import { TextField, type CampoProps } from './TextField';

export function PasswordField(props: Omit<CampoProps, 'type'>) {
  const [visivel, setVisivel] = useState(false);
  return (
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
}
