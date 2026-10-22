import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { VisuallyHidden } from 'react-aria-components';
import { CircleAlert, Lock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EstadoErro } from '../../components/ui/EstadoErro';
import { Skeleton } from '../../components/ui/Skeleton';
import { TextField } from '../../components/ui/TextField';
import { notificar } from '../../components/ui/Toast';
import { mensagemDeErro } from '../../lib/erros';
import { formatarDataHora } from '../../lib/formatar';
import { criarAnotacao, listarAnotacoes } from '../../lib/psicologoApi';
import pagina from '../Pagina.module.css';
import css from './Anotacoes.module.css';

// Mesmo limite do servidor (anotacaoSchema).
const MAX_CARACTERES = 5000;

export function Anotacoes({ id }: { id: number }) {
  const cliente = useQueryClient();
  const chave = ['paciente', id, 'anotacoes'];
  const lista = useQuery({ queryKey: chave, queryFn: () => listarAnotacoes(id) });
  const [texto, setTexto] = useState('');
  const [vazio, setVazio] = useState(false);

  const salvar = useMutation({
    mutationFn: () => criarAnotacao(id, texto.trim()),
    onSuccess: async () => {
      setTexto('');
      notificar({ titulo: 'Anotação salva' });
      await cliente.invalidateQueries({ queryKey: chave });
    },
  });

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!texto.trim()) return setVazio(true);
    salvar.mutate();
  }

  return (
    <div className={pagina.secao}>
      <Card>
        <form onSubmit={enviar} noValidate className={pagina.secao}>
          <p className={css.aviso}>
            <Lock aria-hidden />
            Visível só para você. Retida por 5 anos.
          </p>
          <TextField
            multilinha
            rotulo="Nova anotação"
            value={texto}
            maxLength={MAX_CARACTERES}
            onChange={(valor) => {
              setTexto(valor);
              setVazio(false);
            }}
            descricao={`${texto.length} de ${MAX_CARACTERES} caracteres`}
            erro={vazio ? 'Escreva a anotação antes de salvar.' : undefined}
          />
          {salvar.isError && (
            <p role="alert" className={css.erro}>
              <CircleAlert aria-hidden />
              {mensagemDeErro(salvar.error, 'Não foi possível salvar a anotação.')}
            </p>
          )}
          <div>
            <Button type="submit" isPending={salvar.isPending}>
              Salvar anotação
            </Button>
          </div>
        </form>
      </Card>

      {lista.isPending ? (
        <div role="status" className={pagina.esqueleto}>
          <VisuallyHidden>Carregando anotações</VisuallyHidden>
          <Skeleton forma="bloco" />
        </div>
      ) : lista.isError ? (
        <EstadoErro erro={lista.error} onTentar={() => void lista.refetch()} titulo="Não foi possível carregar as anotações" />
      ) : lista.data.length === 0 ? (
        <p className={pagina.apoio}>Nenhuma anotação ainda.</p>
      ) : (
        <ul className={css.lista}>
          {lista.data.map((anotacao) => (
            <li key={anotacao.id}>
              <Card>
                <p className={css.data}>{formatarDataHora(anotacao.criadoEm)}</p>
                <p className={css.texto}>{anotacao.conteudo}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
