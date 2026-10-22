import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { parseDate } from '@internationalized/date';
import { Button as BotaoAria, VisuallyHidden } from 'react-aria-components';
import { MapPinCheck, SearchX } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { DateRangePicker, type Periodo } from '../../components/ui/DateRangePicker';
import { Dialog } from '../../components/ui/Dialog';
import { Emocoes } from '../../components/ui/Emocoes';
import { EmptyState } from '../../components/ui/EmptyState';
import { EstadoErro } from '../../components/ui/EstadoErro';
import { Select } from '../../components/ui/Select';
import { Skeleton } from '../../components/ui/Skeleton';
import { cx } from '../../lib/cx';
import { formatarCheckin, formatarNumero, plural } from '../../lib/formatar';
import { diaIso } from '../../lib/periodo';
import { listarCheckins, listarTodosPacientes, type CheckinListado } from '../../lib/psicologoApi';
import { rotuloEmocao } from '../../lib/rotulos';
import { useCompacto } from '../../lib/useCompacto';
import linhas from '../Linhas.module.css';
import pagina from '../Pagina.module.css';
import { DetalheCheckin } from './DetalheCheckin';
import css from './Checkins.module.css';

const TODOS = 'todos';
const EMOCOES = ['feliz', 'triste', 'ansioso', 'calmo', 'irritado', 'cansado'];
const OPCOES_EMOCAO = [{ id: TODOS, rotulo: 'Todas as emoções' }, ...EMOCOES.map((e) => ({ id: e, rotulo: rotuloEmocao(e) }))];

// Dia vindo da URL: texto inválido vale como filtro ausente.
function lerDia(texto: string | null) {
  try {
    return texto ? parseDate(texto) : null;
  } catch {
    return null;
  }
}

const valor = (numero: number | null) => (numero === null ? 'Sem dado' : String(numero));

export default function Checkins() {
  const compacto = useCompacto();
  const [params, setParams] = useSearchParams();
  const [aberto, setAberto] = useState<CheckinListado | null>(null);

  const pacienteTexto = params.get('pacienteId');
  const pacienteId = pacienteTexto !== null && Number.isInteger(Number(pacienteTexto)) && Number(pacienteTexto) > 0 ? Number(pacienteTexto) : undefined;
  const emocao = EMOCOES.find((e) => e === params.get('emocao'));
  const inicio = lerDia(params.get('de'));
  const fim = lerDia(params.get('ate'));
  const periodo: Periodo | null = inicio && fim ? { start: inicio, end: fim } : null;
  const de = periodo ? diaIso(periodo.start) : undefined;
  const ate = periodo ? diaIso(periodo.end) : undefined;
  const filtrando = pacienteId !== undefined || emocao !== undefined || periodo !== null;

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

  const pacientes = useQuery({ queryKey: ['seletor-pacientes'], queryFn: listarTodosPacientes });
  const opcoesPaciente = [
    { id: TODOS, rotulo: 'Todos os pacientes' },
    // Só quem compartilha humor tem check-ins para mostrar.
    ...(pacientes.data ?? []).filter((p) => p.compartilhaHumor).map((p) => ({ id: String(p.id), rotulo: p.nome })),
  ];

  // O servidor só devolve o sono de quem compartilha hábitos: o consentimento explica o vazio.
  const habitos = new Map((pacientes.data ?? []).map((p) => [p.id, p.compartilhaHabitos]));

  const consulta = useInfiniteQuery({
    queryKey: ['checkins', pacienteId, de, ate, emocao],
    queryFn: ({ pageParam }) => listarCheckins({ pacienteId, de, ate, emocao }, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultima) => ultima.proximoCursor ?? undefined,
    placeholderData: keepPreviousData,
  });
  const checkins = consulta.data?.pages.flatMap((p) => p.itens) ?? [];

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
        Check-ins
      </h1>

      <div className={css.filtros}>
        <Select
          rotulo="Paciente"
          opcoes={opcoesPaciente}
          valor={pacienteId === undefined ? TODOS : String(pacienteId)}
          onChange={(id) => atualizar({ pacienteId: id === TODOS ? undefined : id })}
        />
        <Select
          rotulo="Emoção"
          opcoes={OPCOES_EMOCAO}
          valor={emocao ?? TODOS}
          onChange={(id) => atualizar({ emocao: id === TODOS ? undefined : id })}
        />
        <div className={pagina.largura}>
          <DateRangePicker
            valor={periodo}
            onChange={(novo) => atualizar({ de: novo ? diaIso(novo.start) : undefined, ate: novo ? diaIso(novo.end) : undefined })}
          />
        </div>
        {filtrando && (
          <div className={pagina.largura}>
            <Button variante="text" onPress={() => setParams({}, { replace: true })}>
              Limpar filtros
            </Button>
          </div>
        )}
      </div>

      {consulta.isError && !consulta.data ? (
        <EstadoErro erro={consulta.error} onTentar={() => void consulta.refetch()} titulo="Não foi possível carregar os check-ins" />
      ) : consulta.isPending ? (
        <div role="status" className={pagina.esqueleto}>
          <VisuallyHidden>Carregando check-ins</VisuallyHidden>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} forma="bloco" />
          ))}
        </div>
      ) : checkins.length === 0 && !consulta.hasNextPage ? (
        <EmptyState
          icone={filtrando ? <SearchX /> : <MapPinCheck />}
          titulo={filtrando ? 'Nenhum check-in com esses filtros' : 'Nenhum check-in ainda'}
          descricao={
            filtrando
              ? 'Mude o paciente, a emoção ou o período para ver outros registros.'
              : 'Os registros aparecem aqui quando os pacientes que compartilham humor fizerem check-in.'
          }
          acao={
            filtrando ? (
              <Button variante="tonal" onPress={() => setParams({}, { replace: true })}>
                Limpar filtros
              </Button>
            ) : undefined
          }
        />
      ) : checkins.length === 0 ? (
        <div className={css.continuar}>
          <p className={pagina.apoio}>Nenhum registro com esses filtros nos itens já examinados. Ainda há registros para examinar.</p>
          {maisBotao}
        </div>
      ) : (
        <>
          <VisuallyHidden role="status">{plural(checkins.length, 'check-in listado', 'check-ins listados')}</VisuallyHidden>
          <div className={cx(linhas.raiz, css.colunas)} data-compacto={compacto}>
            <table className={linhas.tabela} aria-label="Check-ins" aria-busy={consulta.isFetching}>
              <thead className={linhas.cabecalho}>
                <tr className={linhas.grade}>
                  <th scope="col">Paciente</th>
                  <th scope="col">Data e horário</th>
                  <th scope="col">Emoções</th>
                  <th scope="col">Humor</th>
                  <th scope="col">Ansiedade</th>
                  <th scope="col">Sono</th>
                </tr>
              </thead>
              <tbody className={linhas.lista}>
                {checkins.map((c) => {
                  const quando = formatarCheckin(c.data, c.horario);
                  return (
                    <tr key={c.id} className={cx(linhas.grade, linhas.linha)}>
                      <th scope="row">
                        <BotaoAria className={linhas.principal} aria-label={`${c.nome}, check-in de ${quando}`} onPress={() => setAberto(c)}>
                          {c.nome}
                        </BotaoAria>
                      </th>
                      <td className={linhas.celula}>
                        <span className={linhas.rotulo}>Data e horário</span>
                        {quando}
                      </td>
                      <td className={linhas.celula}>
                        <span className={linhas.rotulo}>Emoções</span>
                        <Emocoes emocoes={c.emocoes} />
                      </td>
                      <td className={linhas.celula}>
                        <span className={linhas.rotulo}>Humor, de 1 a 10</span>
                        {valor(c.humor)}
                      </td>
                      <td className={linhas.celula}>
                        <span className={linhas.rotulo}>Ansiedade, de 1 a 10</span>
                        {valor(c.ansiedade)}
                      </td>
                      <td className={linhas.celula}>
                        <span className={linhas.rotulo}>Horas de sono</span>
                        {c.sonoHoras !== null ? `${formatarNumero(c.sonoHoras)} h` : habitos.get(c.pacienteId) === false ? 'Não compartilha' : 'Sem dado'}
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

      <Dialog
        titulo={aberto ? `${aberto.nome}, ${formatarCheckin(aberto.data, aberto.horario)}` : 'Check-in'}
        isOpen={aberto !== null}
        onOpenChange={(estaAberto) => !estaAberto && setAberto(null)}
        acoes={
          <Button variante="tonal" onPress={() => setAberto(null)}>
            Fechar
          </Button>
        }
      >
        {aberto && <DetalheCheckin id={aberto.id} />}
      </Dialog>
    </section>
  );
}
