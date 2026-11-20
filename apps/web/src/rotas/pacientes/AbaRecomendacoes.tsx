import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { VisuallyHidden } from 'react-aria-components';
import { CircleCheck, CircleX, Clock, type LucideIcon } from 'lucide-react';
import { AvisoErro } from '../../components/ui/AvisoErro';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Dialog } from '../../components/ui/Dialog';
import { EstadoErro } from '../../components/ui/EstadoErro';
import { Select } from '../../components/ui/Select';
import { Skeleton } from '../../components/ui/Skeleton';
import { TextField } from '../../components/ui/TextField';
import { notificar } from '../../components/ui/Toast';
import { cx } from '../../lib/cx';
import { mensagemDeErro } from '../../lib/erros';
import { formatarData } from '../../lib/formatar';
import {
  cancelarRecomendacao,
  criarRecomendacao,
  listarExercicios,
  listarRecomendacoes,
  type Recomendacao,
} from '../../lib/psicologoApi';
import pagina from '../Pagina.module.css';
import css from './AbaRecomendacoes.module.css';

// Mesmos limites do servidor (novaSchema).
const MAX_TITULO = 120;
const MAX_DESCRICAO = 2000;
const MAX_NOTA = 1000;
const PROPRIO = 'proprio';

// Cada estado tem ícone próprio além do texto: a distinção nunca depende só da cor.
function situacao(r: Recomendacao): { Icone: LucideIcon; texto: string } {
  if (r.feitoEm) return { Icone: CircleCheck, texto: `Feita em ${formatarData(r.feitoEm)}` };
  if (r.canceladoEm) return { Icone: CircleX, texto: `Cancelada em ${formatarData(r.canceladoEm)}` };
  return { Icone: Clock, texto: 'Pendente' };
}

export function AbaRecomendacoes({ id }: { id: number }) {
  const cliente = useQueryClient();
  const chave = ['paciente', id, 'recomendacoes'];
  const lista = useQuery({ queryKey: chave, queryFn: () => listarRecomendacoes(id) });
  const catalogo = useQuery({ queryKey: ['exercicios', 'catalogo'], queryFn: listarExercicios, staleTime: Infinity });

  const [escolha, setEscolha] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [nota, setNota] = useState('');
  const [tentou, setTentou] = useState(false);
  const [cancelando, setCancelando] = useState<Recomendacao | null>(null);

  const proprio = escolha === PROPRIO;
  const tituloCurto = titulo.trim().length < 2;
  const erroEscolha = tentou && escolha === null ? 'Escolha um exercício.' : undefined;
  const erroTitulo = tentou && proprio && tituloCurto ? 'Escreva um título com ao menos 2 caracteres.' : undefined;

  const enviar = useMutation({
    mutationFn: () =>
      criarRecomendacao(
        id,
        proprio
          ? { titulo: titulo.trim(), descricao: descricao.trim(), nota: nota.trim() }
          : { exercicioId: escolha!, nota: nota.trim() },
      ),
    onSuccess: async () => {
      setEscolha(null);
      setTitulo('');
      setDescricao('');
      setNota('');
      setTentou(false);
      notificar({ titulo: 'Recomendação enviada', descricao: 'O paciente a vê na aba Bem-Estar do app.' });
      await cliente.invalidateQueries({ queryKey: chave });
    },
  });

  const cancelar = useMutation({
    mutationFn: (recomendacaoId: number) => cancelarRecomendacao(id, recomendacaoId),
    onSuccess: async () => {
      setCancelando(null);
      notificar({ titulo: 'Recomendação cancelada' });
      await cliente.invalidateQueries({ queryKey: chave });
    },
    onError: async (erro) => {
      setCancelando(null);
      notificar({ titulo: 'Não foi possível cancelar a recomendação', descricao: mensagemDeErro(erro), tipo: 'erro' });
      // O paciente pode ter marcado como feita enquanto o diálogo estava aberto.
      await cliente.invalidateQueries({ queryKey: chave });
    },
  });

  function submeter(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setTentou(true);
    if (escolha === null || (proprio && tituloCurto)) return;
    enviar.mutate();
  }

  return (
    <div className={pagina.secao}>
      <div>
        <h2 className={pagina.tituloSecao}>Recomendações</h2>
        <p className={pagina.subtituloSecao}>Exercícios que o paciente vê na aba Bem-Estar do app, com a sua nota.</p>
      </div>

      <Card>
        <form onSubmit={submeter} noValidate className={pagina.secao}>
          <h3 className={pagina.tituloSecao}>Nova recomendação</h3>
          <Select
            rotulo="Exercício"
            placeholder="Escolha um exercício"
            opcoes={[...(catalogo.data ?? []).map((e) => ({ id: e.id, rotulo: e.titulo })), { id: PROPRIO, rotulo: 'Escrever um exercício próprio' }]}
            valor={escolha}
            onChange={setEscolha}
            erro={erroEscolha}
          />
          {catalogo.isError && <AvisoErro>{mensagemDeErro(catalogo.error, 'Não foi possível carregar o catálogo de exercícios.')}</AvisoErro>}
          {proprio && (
            <>
              <TextField rotulo="Título" value={titulo} maxLength={MAX_TITULO} onChange={setTitulo} autoComplete="off" erro={erroTitulo} />
              <TextField
                multilinha
                rotulo="Descrição (opcional)"
                value={descricao}
                maxLength={MAX_DESCRICAO}
                onChange={setDescricao}
                descricao="Como o paciente deve fazer o exercício."
              />
            </>
          )}
          <TextField
            multilinha
            rotulo="Nota para o paciente (opcional)"
            value={nota}
            maxLength={MAX_NOTA}
            onChange={setNota}
            descricao={`${nota.length} de ${MAX_NOTA} caracteres`}
          />
          {enviar.isError && <AvisoErro>{mensagemDeErro(enviar.error, 'Não foi possível enviar a recomendação.')}</AvisoErro>}
          <div>
            <Button type="submit" isPending={enviar.isPending}>
              Recomendar
            </Button>
          </div>
        </form>
      </Card>

      {lista.isPending ? (
        <div role="status" className={pagina.esqueleto}>
          <VisuallyHidden>Carregando as recomendações</VisuallyHidden>
          <Skeleton forma="bloco" />
        </div>
      ) : lista.isError ? (
        <EstadoErro erro={lista.error} onTentar={() => void lista.refetch()} titulo="Não foi possível carregar as recomendações" />
      ) : lista.data.length === 0 ? (
        <p className={pagina.apoio}>Nenhuma recomendação enviada a este paciente ainda.</p>
      ) : (
        <ul className={css.lista}>
          {lista.data.map((r) => {
            const { Icone, texto } = situacao(r);
            return (
              <li key={r.id}>
                <Card className={cx(css.item, r.canceladoEm !== null && css.cancelada)}>
                  <div className={css.topo}>
                    <h3 className={css.titulo}>{r.titulo}</h3>
                    <span className={css.situacao}>
                      <Icone aria-hidden />
                      {texto}
                    </span>
                  </div>
                  {r.descricao && <p className={css.texto}>{r.descricao}</p>}
                  {r.nota && <p className={css.texto}>Nota: {r.nota}</p>}
                  <p className={css.data}>Enviada em {formatarData(r.criadoEm)}</p>
                  {!r.feitoEm && !r.canceladoEm && (
                    <div>
                      <Button variante="text" aria-label={`Cancelar a recomendação ${r.titulo}`} onPress={() => setCancelando(r)}>
                        Cancelar
                      </Button>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog
        titulo="Cancelar esta recomendação?"
        isOpen={cancelando !== null}
        onOpenChange={(aberto) => !aberto && setCancelando(null)}
        acoes={
          <>
            <Button variante="text" onPress={() => setCancelando(null)}>
              Voltar
            </Button>
            <Button isPending={cancelar.isPending} onPress={() => cancelando && cancelar.mutate(cancelando.id)}>
              Cancelar recomendação
            </Button>
          </>
        }
      >
        {cancelando && `"${cancelando.titulo}" deixa de aparecer no app do paciente. Isso não pode ser desfeito.`}
      </Dialog>
    </div>
  );
}
