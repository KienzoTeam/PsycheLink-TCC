import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { VisuallyHidden } from 'react-aria-components';
import { ClipboardList, SearchX } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ChipFiltro } from '../../components/ui/Chip';
import { Disclaimer } from '../../components/ui/Disclaimer';
import { EmptyState } from '../../components/ui/EmptyState';
import { EstadoErro } from '../../components/ui/EstadoErro';
import { Skeleton } from '../../components/ui/Skeleton';
import { cx } from '../../lib/cx';
import { plural } from '../../lib/formatar';
import { listarAplicacoes, listarEscalas, type StatusAplicacao } from '../../lib/psicologoApi';
import { AVISO_ESCALA, STATUS_APLICACAO } from '../../lib/rotulos';
import { useCompacto } from '../../lib/useCompacto';
import linhas from '../Linhas.module.css';
import pagina from '../Pagina.module.css';
import { SolicitarEscala } from './SolicitarEscala';
import { TabelaAplicacoes } from './TabelaAplicacoes';
import css from './Escalas.module.css';

const ehStatus = (valor: string | null): valor is StatusAplicacao => valor !== null && valor in STATUS_APLICACAO;

function Catalogo() {
  const compacto = useCompacto();
  const consulta = useQuery({ queryKey: ['escalas', 'catalogo'], queryFn: listarEscalas, staleTime: Infinity });

  if (consulta.isError) {
    return <EstadoErro erro={consulta.error} onTentar={() => void consulta.refetch()} titulo="Não foi possível carregar o catálogo" />;
  }
  if (consulta.isPending) {
    return (
      <div role="status" className={pagina.esqueleto}>
        <VisuallyHidden>Carregando o catálogo</VisuallyHidden>
        <Skeleton forma="bloco" />
      </div>
    );
  }
  return (
    <div className={cx(linhas.raiz, css.colunasCatalogo)} data-compacto={compacto}>
      <table className={linhas.tabela} aria-label="Catálogo de escalas">
        <thead className={linhas.cabecalho}>
          <tr className={linhas.grade}>
            <th scope="col">Escala</th>
            <th scope="col">Nome</th>
            <th scope="col">Itens</th>
            <th scope="col">Pontuação bruta</th>
            <th scope="col">Referência de validação</th>
          </tr>
        </thead>
        <tbody className={linhas.lista}>
          {consulta.data.map((e) => (
            <tr key={e.id} className={cx(linhas.grade, linhas.linha)}>
              <th scope="row">
                <span className={css.principalTexto}>{e.sigla}</span>
              </th>
              <td className={linhas.celula}>
                <span className={linhas.rotulo}>Nome</span>
                {e.nome}
              </td>
              <td className={linhas.celula}>
                <span className={linhas.rotulo}>Itens</span>
                {e.totalQuestoes}
              </td>
              <td className={linhas.celula}>
                <span className={linhas.rotulo}>Pontuação bruta</span>0 a {e.pontuacaoMaxima}
              </td>
              <td className={linhas.celula}>
                <span className={linhas.rotulo}>Referência de validação</span>
                {e.validacaoRef}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Escalas() {
  const [params, setParams] = useSearchParams();
  const statusParam = params.get('status');
  const status = ehStatus(statusParam) ? statusParam : undefined;
  const [solicitando, setSolicitando] = useState(false);

  const consulta = useInfiniteQuery({
    queryKey: ['aplicacoes', status],
    queryFn: ({ pageParam }) => listarAplicacoes(status, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultima) => ultima.proximoCursor ?? undefined,
    placeholderData: keepPreviousData,
  });
  const aplicacoes = consulta.data?.pages.flatMap((p) => p.aplicacoes) ?? [];

  const filtrar = (novo: StatusAplicacao | undefined) =>
    setParams(novo ? { status: novo } : {}, { replace: true });

  return (
    <section className={pagina.tela} aria-labelledby="titulo-tela">
      <header className={pagina.cabecalho}>
        <h1 id="titulo-tela" className={pagina.titulo}>
          Escalas
        </h1>
        <Button icone={<ClipboardList />} onPress={() => setSolicitando(true)}>
          Solicitar escala
        </Button>
      </header>

      <div className={pagina.secao}>
        <div>
          <h2 className={pagina.tituloSecao}>Catálogo</h2>
          <p className={pagina.subtituloSecao}>{AVISO_ESCALA}</p>
        </div>
        <Catalogo />
      </div>

      <div className={pagina.secao}>
        <h2 className={pagina.tituloSecao}>Aplicações</h2>
        <div role="group" aria-label="Filtrar por situação" className={css.situacoes}>
          {(Object.keys(STATUS_APLICACAO) as StatusAplicacao[]).map((id) => (
            <ChipFiltro key={id} isSelected={status === id} onChange={(marcado) => filtrar(marcado ? id : undefined)}>
              {STATUS_APLICACAO[id]}
            </ChipFiltro>
          ))}
        </div>
        <p className={pagina.subtituloSecao}>Só aparecem pacientes que compartilham escalas.</p>

        {consulta.isError && !consulta.data ? (
          <EstadoErro erro={consulta.error} onTentar={() => void consulta.refetch()} titulo="Não foi possível carregar as aplicações" />
        ) : consulta.isPending ? (
          <div role="status" className={pagina.esqueleto}>
            <VisuallyHidden>Carregando as aplicações</VisuallyHidden>
            <Skeleton forma="bloco" />
            <Skeleton forma="bloco" />
          </div>
        ) : aplicacoes.length === 0 ? (
          status ? (
            <EmptyState
              icone={<SearchX />}
              titulo={`Nenhuma aplicação ${STATUS_APLICACAO[status].toLowerCase()}`}
              descricao="Escolha outra situação ou tire o filtro para ver todas as aplicações."
              acao={
                <Button variante="tonal" onPress={() => filtrar(undefined)}>
                  Limpar filtro
                </Button>
              }
            />
          ) : (
            <EmptyState
              icone={<ClipboardList />}
              titulo="Nenhuma escala solicitada ainda"
              descricao="Solicite uma escala a um paciente que compartilha escalas. Quando ele responder, o escore bruto aparece aqui."
              acao={<Button onPress={() => setSolicitando(true)}>Solicitar escala</Button>}
            />
          )
        ) : (
          <>
            <VisuallyHidden role="status">{plural(aplicacoes.length, 'aplicação listada', 'aplicações listadas')}</VisuallyHidden>
            <TabelaAplicacoes aplicacoes={aplicacoes} rotulo="Aplicações de escalas" comPaciente />
            {consulta.hasNextPage && (
              <div className={pagina.mais}>
                <Button variante="outlined" isPending={consulta.isFetchingNextPage} onPress={() => void consulta.fetchNextPage()}>
                  Carregar mais
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Disclaimer />
      <SolicitarEscala isOpen={solicitando} onOpenChange={setSolicitando} />
    </section>
  );
}
