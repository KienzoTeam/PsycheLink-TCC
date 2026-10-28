import { useSearchParams } from 'react-router';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { VisuallyHidden } from 'react-aria-components';
import { SearchX, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DateRangePicker, type Periodo } from '../../components/ui/DateRangePicker';
import { EmptyState } from '../../components/ui/EmptyState';
import { EstadoErro } from '../../components/ui/EstadoErro';
import { Select } from '../../components/ui/Select';
import { Skeleton } from '../../components/ui/Skeleton';
import { cx } from '../../lib/cx';
import { formatarDataHora, formatarDia, plural } from '../../lib/formatar';
import { diaIso, lerDia } from '../../lib/periodo';
import {
  listarAcoesAuditoria,
  listarAuditoria,
  listarTodosPacientes,
  type EventoAuditoria,
  type StatusConsulta,
} from '../../lib/psicologoApi';
import { rotuloAcao, STATUS_CONSULTA } from '../../lib/rotulos';
import { useCompacto } from '../../lib/useCompacto';
import linhas from '../Linhas.module.css';
import pagina from '../Pagina.module.css';
import css from './Auditoria.module.css';

const TODOS = 'todos';
const QUEM = { psicologo: 'Você', paciente: 'Paciente' };
// O IP só ajuda a reconhecer um acesso indevido: aparece nos eventos de conta e sessão.
const ACOES_DE_ACESSO = new Set(['login_ok', 'login_falha', '2fa_ok', '2fa_falha', 'logout', 'sessao_reuso_detectado', 'sessoes_encerradas', 'senha_alterada']);
const CATEGORIAS: Record<string, string> = { humor: 'Humor', habitos: 'Hábitos', escalas: 'Escalas', diario: 'Diário' };

// Só ids, tipos e contagens chegam nos metadados; aqui viram frases. A chave desconhecida não aparece.
function detalhesDoEvento({ acao, metadados: m, ip }: EventoAuditoria) {
  const detalhes: string[] = [];
  if (m.sigla !== undefined) detalhes.push(`Escala ${m.sigla}`);
  if (typeof m.status === 'string') detalhes.push(`Situação: ${(STATUS_CONSULTA[m.status as StatusConsulta] ?? m.status).toLowerCase()}`);
  if (m.observacaoAlterada) detalhes.push('Observação da consulta alterada');
  if (m.remarcadaDe !== undefined) detalhes.push('Criada ao remarcar outra consulta');
  if (m.tipo !== undefined) detalhes.push(m.tipo === 'geral' ? 'Relatório geral' : 'Relatório do paciente');
  if (typeof m.de === 'string' && typeof m.ate === 'string') detalhes.push(`Período ${formatarDia(m.de)} a ${formatarDia(m.ate)}`);
  if (m.incluirAnotacoes !== undefined) detalhes.push(m.incluirAnotacoes ? 'Com anotações privadas' : 'Sem anotações privadas');
  if (m.origem === 'relatorio') detalhes.push('Lidas para um relatório');
  if (typeof m.quantidade === 'number') detalhes.push(plural(m.quantidade, 'sessão encerrada', 'sessões encerradas'));
  if (m.encerradoPor !== undefined) detalhes.push(`Encerrado por ${m.encerradoPor === 'psicologo' ? 'você' : 'o paciente'}`);
  for (const [chave, rotulo] of Object.entries(CATEGORIAS)) {
    if (typeof m[chave] === 'boolean') detalhes.push(`${rotulo}: ${m[chave] ? 'compartilha' : 'não compartilha'}`);
  }
  if (ip && ACOES_DE_ACESSO.has(acao)) detalhes.push(`IP ${ip}`);
  return detalhes;
}

export default function Auditoria() {
  const compacto = useCompacto();
  const [params, setParams] = useSearchParams();

  const acao = params.get('acao') ?? undefined;
  const pacienteTexto = params.get('pacienteId');
  const pacienteId = pacienteTexto !== null && /^[1-9]\d*$/.test(pacienteTexto) ? Number(pacienteTexto) : undefined;
  const inicio = lerDia(params.get('de'));
  const fim = lerDia(params.get('ate'));
  const periodo: Periodo | null = inicio && fim ? { start: inicio, end: fim } : null;
  const de = periodo ? diaIso(periodo.start) : undefined;
  const ate = periodo ? diaIso(periodo.end) : undefined;
  const filtrando = acao !== undefined || pacienteId !== undefined || periodo !== null;

  const atualizar = (mudancas: Record<string, string | undefined>) =>
    setParams(
      (atual) => {
        const novos = new URLSearchParams(atual);
        for (const [chave, texto] of Object.entries(mudancas)) {
          if (texto) novos.set(chave, texto);
          else novos.delete(chave);
        }
        return novos;
      },
      { replace: true },
    );

  const acoes = useQuery({ queryKey: ['auditoria', 'acoes'], queryFn: listarAcoesAuditoria, staleTime: Infinity });
  const pacientes = useQuery({ queryKey: ['seletor-pacientes'], queryFn: listarTodosPacientes });
  const rotulos = new Map((acoes.data ?? []).map((a) => [a.acao, a.rotulo]));

  const consulta = useInfiniteQuery({
    queryKey: ['auditoria', acao, pacienteId, de, ate],
    queryFn: ({ pageParam }) => listarAuditoria({ acao, pacienteId, de, ate }, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultima) => ultima.proximoCursor ?? undefined,
    placeholderData: keepPreviousData,
  });
  const eventos = consulta.data?.pages.flatMap((p) => p.eventos) ?? [];

  const limpar = () => setParams({}, { replace: true });
  const maisBotao = consulta.hasNextPage && (
    <div className={pagina.mais}>
      <Button variante="outlined" isPending={consulta.isFetchingNextPage} onPress={() => void consulta.fetchNextPage()}>
        Carregar mais
      </Button>
    </div>
  );

  return (
    <section className={pagina.tela} aria-labelledby="titulo-tela">
      <h1 id="titulo-tela" className={pagina.titulo}>
        Auditoria
      </h1>

      <Card>
        <div className={pagina.secao}>
          <h2 className={pagina.tituloSecao}>O que fica registrado</h2>
          <p className={pagina.apoio}>
            Cada acesso seu a dados de pacientes, os logins, as escalas, as consultas e os relatórios exportados, mais os eventos que os
            seus pacientes geram sobre o vínculo com você: consentimento, vínculo e resposta de escala. O registro é imutável: ninguém,
            nem você, altera ou apaga um evento. O conteúdo dos registros do paciente nunca é gravado aqui, só o que aconteceu e quando.
          </p>
        </div>
      </Card>

      <div className={css.filtros}>
        <Select
          rotulo="Ação"
          opcoes={[{ id: TODOS, rotulo: 'Todas as ações' }, ...(acoes.data ?? []).map((a) => ({ id: a.acao, rotulo: a.rotulo }))]}
          valor={acao ?? TODOS}
          onChange={(id) => atualizar({ acao: id === TODOS ? undefined : id })}
        />
        <Select
          rotulo="Paciente"
          opcoes={[{ id: TODOS, rotulo: 'Todos os pacientes' }, ...(pacientes.data ?? []).map((p) => ({ id: String(p.id), rotulo: p.nome }))]}
          valor={pacienteId === undefined ? TODOS : String(pacienteId)}
          onChange={(id) => atualizar({ pacienteId: id === TODOS ? undefined : id })}
        />
        <div className={pagina.largura}>
          <DateRangePicker
            valor={periodo}
            onChange={(novo) => atualizar({ de: novo ? diaIso(novo.start) : undefined, ate: novo ? diaIso(novo.end) : undefined })}
          />
        </div>
        {filtrando && (
          <div className={pagina.largura}>
            <Button variante="text" onPress={limpar}>
              Limpar filtros
            </Button>
          </div>
        )}
      </div>

      {consulta.isError && !consulta.data ? (
        <EstadoErro erro={consulta.error} onTentar={() => void consulta.refetch()} titulo="Não foi possível carregar a auditoria" />
      ) : consulta.isPending ? (
        <div role="status" className={pagina.esqueleto}>
          <VisuallyHidden>Carregando a auditoria</VisuallyHidden>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} forma="bloco" />
          ))}
        </div>
      ) : eventos.length === 0 && !consulta.hasNextPage ? (
        <EmptyState
          icone={filtrando ? <SearchX /> : <ShieldCheck />}
          titulo={filtrando ? 'Nenhum evento com esses filtros' : 'Nenhum evento registrado ainda'}
          descricao={filtrando ? 'Mude a ação, o paciente ou o período para ver outros eventos.' : 'Os eventos aparecem aqui conforme você usa a plataforma.'}
          acao={
            filtrando ? (
              <Button variante="tonal" onPress={limpar}>
                Limpar filtros
              </Button>
            ) : undefined
          }
        />
      ) : eventos.length === 0 ? (
        <div className={css.continuar}>
          <p className={pagina.apoio}>Nenhum evento com esses filtros nos itens já examinados. Ainda há eventos para examinar.</p>
          {maisBotao}
        </div>
      ) : (
        <>
          <VisuallyHidden role="status">{plural(eventos.length, 'evento listado', 'eventos listados')}</VisuallyHidden>
          <div className={cx(linhas.raiz, css.colunas)} data-compacto={compacto}>
            <table className={linhas.tabela} aria-label="Eventos de auditoria" aria-busy={consulta.isFetching}>
              <thead className={linhas.cabecalho}>
                <tr className={linhas.grade}>
                  <th scope="col">Data e hora</th>
                  <th scope="col">Ação</th>
                  <th scope="col">Paciente</th>
                  <th scope="col">Quem</th>
                  <th scope="col">Detalhes</th>
                </tr>
              </thead>
              <tbody className={linhas.lista}>
                {eventos.map((e) => {
                  const detalhes = detalhesDoEvento(e);
                  return (
                    <tr key={e.id} className={cx(linhas.grade, linhas.linha)}>
                      <th scope="row">
                        <span className={css.principalTexto}>{formatarDataHora(e.criadoEm)}</span>
                      </th>
                      <td className={linhas.celula}>
                        <span className={linhas.rotulo}>Ação</span>
                        {rotulos.get(e.acao) ?? rotuloAcao(e.acao)}
                      </td>
                      <td className={linhas.celula}>
                        <span className={linhas.rotulo}>Paciente</span>
                        {e.pacienteNome ?? 'Sem paciente'}
                      </td>
                      <td className={linhas.celula}>
                        <span className={linhas.rotulo}>Quem</span>
                        {e.atorPapel ? QUEM[e.atorPapel] : 'Não identificado'}
                      </td>
                      <td className={linhas.celula}>
                        <span className={linhas.rotulo}>Detalhes</span>
                        {detalhes.length > 0 ? detalhes.join(' · ') : 'Sem detalhes'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {maisBotao}
        </>
      )}
    </section>
  );
}
