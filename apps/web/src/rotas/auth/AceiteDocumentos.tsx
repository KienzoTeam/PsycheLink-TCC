import { useState } from 'react';
import { useController, type Control } from 'react-hook-form';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { Dialog } from '../../components/ui/Dialog';
import { DATA_DOCUMENTOS, POLITICA_PSICOLOGO, TERMOS_PSICOLOGO, type Secao } from '../../lib/documentos';
import type { Valores } from './validacao';
import css from './AceiteDocumentos.module.css';

const DOCUMENTOS = { termos: { titulo: 'Termos de Uso', secoes: TERMOS_PSICOLOGO }, politica: { titulo: 'Política de Privacidade', secoes: POLITICA_PSICOLOGO } };

// Leitura dos documentos e aceite obrigatório no cadastro do psicólogo (o servidor registra a versão).
export function AceiteDocumentos({ control }: { control: Control<Valores> }) {
  const { field, fieldState } = useController({ control, name: 'aceite' });
  const [aberto, setAberto] = useState<keyof typeof DOCUMENTOS | null>(null);
  const doc = aberto ? DOCUMENTOS[aberto] : null;

  return (
    <div className={css.aceite}>
      <div className={css.links}>
        <Button variante="text" onPress={() => setAberto('termos')}>
          Ler os Termos de Uso
        </Button>
        <Button variante="text" onPress={() => setAberto('politica')}>
          Ler a Política de Privacidade
        </Button>
      </div>
      <Checkbox
        isSelected={Boolean(field.value)}
        onChange={field.onChange}
        inputRef={field.ref}
        isInvalid={Boolean(fieldState.error)}
        aria-describedby={fieldState.error ? 'erro-aceite' : undefined}
      >
        Li e aceito os Termos de Uso e a Política de Privacidade
      </Checkbox>
      {fieldState.error && (
        <p id="erro-aceite" role="alert" className={css.erro}>
          {fieldState.error.message}
        </p>
      )}
      <Dialog
        titulo={doc?.titulo ?? ''}
        isOpen={doc !== null}
        onOpenChange={(abrir) => !abrir && setAberto(null)}
        larga
        acoes={<Button onPress={() => setAberto(null)}>Fechar</Button>}
      >
        <p className={css.data}>Atualizado em {DATA_DOCUMENTOS}</p>
        {doc?.secoes.map((s: Secao, i) => (
          <section key={i} className={css.secao}>
            {s.titulo && <h3 className={css.titulo}>{s.titulo}</h3>}
            {s.paragrafos.map((p, j) => (
              <p key={j}>{p}</p>
            ))}
          </section>
        ))}
      </Dialog>
    </div>
  );
}
