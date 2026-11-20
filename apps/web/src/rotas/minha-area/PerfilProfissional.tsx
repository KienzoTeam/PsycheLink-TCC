import { useState, type FormEvent } from 'react';
import { CheckboxGroup, Label, VisuallyHidden } from 'react-aria-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Info } from 'lucide-react';
import { AvisoErro } from '../../components/ui/AvisoErro';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Checkbox } from '../../components/ui/Checkbox';
import { EstadoErro } from '../../components/ui/EstadoErro';
import { Skeleton } from '../../components/ui/Skeleton';
import { TextField } from '../../components/ui/TextField';
import { notificar } from '../../components/ui/Toast';
import { mensagemDeErro } from '../../lib/erros';
import {
  buscarPerfilProfissional,
  salvarPerfilProfissional,
  type Modalidade,
  type PerfilProfissional as Perfil,
  type Psicologo,
} from '../../lib/psicologoApi';
import pagina from '../Pagina.module.css';
import css from './MinhaArea.module.css';

const CHAVE_PERFIL = ['psicologo', 'perfil'];

// Mesmos limites do servidor (perfilSchema).
const CAMPOS = [
  { id: 'especialidade', rotulo: 'Especialidade', max: 255 },
  { id: 'abordagem', rotulo: 'Abordagem', max: 255 },
  { id: 'atendeEm', rotulo: 'Onde atende', max: 120, descricao: 'Cidade ou região.' },
  { id: 'contato', rotulo: 'Contato', max: 160, descricao: 'Telefone, WhatsApp ou e-mail.' },
  { id: 'sobre', rotulo: 'Sobre você', max: 1000, multilinha: true },
] as const;

type CampoTexto = (typeof CAMPOS)[number]['id'];
type Textos = Record<CampoTexto, string>;

function Formulario({ perfil }: { perfil: Perfil }) {
  const cliente = useQueryClient();
  const [texto, setTexto] = useState(() => Object.fromEntries(CAMPOS.map(({ id }) => [id, perfil[id] ?? ''])) as Textos);
  const [modalidades, setModalidades] = useState<Modalidade[]>(perfil.modalidades);
  const [tentou, setTentou] = useState(false);

  const excedidos = CAMPOS.filter(({ id, max }) => texto[id].trim().length > max).map(({ id }) => id);

  const salvar = useMutation({
    mutationFn: () => {
      const aparados = Object.fromEntries(CAMPOS.map(({ id }) => [id, texto[id].trim()])) as Textos;
      return salvarPerfilProfissional({ ...aparados, modalidades });
    },
    onSuccess: (salvo) => {
      cliente.setQueryData(CHAVE_PERFIL, salvo);
      // A especialidade também vive em /psicologo/me: sincroniza para o cartão de nome não regravar o valor antigo.
      cliente.setQueryData<Psicologo>(['psicologo', 'me'], (me) => me && { ...me, especialidade: salvo.especialidade });
      notificar({ titulo: 'Perfil profissional salvo' });
    },
  });

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setTentou(true);
    if (excedidos.length === 0) salvar.mutate();
  }

  return (
    <form onSubmit={enviar} noValidate className={css.formulario}>
      <div className={pagina.secao}>
        <h2 className={pagina.tituloSecao}>Perfil profissional</h2>
        <p className={css.aviso}>
          <Info aria-hidden />
          Visível só para os pacientes vinculados a você no app.
        </p>
      </div>
      {CAMPOS.map((campo) => (
        <TextField
          key={campo.id}
          rotulo={campo.rotulo}
          value={texto[campo.id]}
          onChange={(valor) => setTexto((atual) => ({ ...atual, [campo.id]: valor }))}
          descricao={'descricao' in campo ? campo.descricao : undefined}
          multilinha={'multilinha' in campo}
          erro={tentou && excedidos.includes(campo.id) ? `Use até ${campo.max} caracteres.` : undefined}
        />
      ))}
      <CheckboxGroup value={modalidades} onChange={(valor) => setModalidades(valor as Modalidade[])} className={css.grupo}>
        <Label className={css.rotuloGrupo}>Modalidades de atendimento</Label>
        <div className={css.opcoes}>
          <Checkbox value="presencial">Presencial</Checkbox>
          <Checkbox value="online">Online</Checkbox>
        </div>
      </CheckboxGroup>
      {salvar.isError && <AvisoErro>{mensagemDeErro(salvar.error, 'Não foi possível salvar o perfil profissional.')}</AvisoErro>}
      <div>
        <Button type="submit" isPending={salvar.isPending}>
          Salvar perfil profissional
        </Button>
      </div>
    </form>
  );
}

export function PerfilProfissional() {
  const perfil = useQuery({ queryKey: CHAVE_PERFIL, queryFn: buscarPerfilProfissional });

  return (
    <Card>
      {perfil.data ? (
        <Formulario perfil={perfil.data} />
      ) : perfil.isError ? (
        <EstadoErro erro={perfil.error} onTentar={() => void perfil.refetch()} titulo="Não foi possível carregar o perfil profissional" />
      ) : (
        <div role="status" className={pagina.esqueleto}>
          <VisuallyHidden>Carregando o perfil profissional</VisuallyHidden>
          <Skeleton forma="bloco" />
        </div>
      )}
    </Card>
  );
}
