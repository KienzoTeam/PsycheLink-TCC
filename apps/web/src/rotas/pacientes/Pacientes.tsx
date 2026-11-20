import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { Link, VisuallyHidden } from 'react-aria-components';
import { Archive, EyeOff, SearchX, UserPlus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Chip, ChipFiltro } from '../../components/ui/Chip';
import { Emocoes } from '../../components/ui/Emocoes';
import { EmptyState } from '../../components/ui/EmptyState';
import { EstadoErro } from '../../components/ui/EstadoErro';
import { Skeleton } from '../../components/ui/Skeleton';
import { TextField } from '../../components/ui/TextField';
import { cx } from '../../lib/cx';
import { formatarDia, plural } from '../../lib/formatar';
import { listarPacientes, type StatusDados } from '../../lib/psicologoApi';
import { STATUS_DADOS } from '../../lib/rotulos';
import { useCompacto } from '../../lib/useCompacto';
import linhas from '../Linhas.module.css';
import pagina from '../Pagina.module.css';
import css from './Pacientes.module.css';

const ATRASO_BUSCA_MS = 300;

const ehStatus = (valor: string | null): valor is StatusDados => valor !== null && valor in STATUS_DADOS;

export default function Pacientes() {
  const navigate = useNavigate();
  const compacto = useCompacto();
  const [params, setParams] = useSearchParams();
  const busca = params.get('busca') ?? '';
  const statusParam = params.get('status');
  const status = ehStatus(statusParam) ? statusParam : undefined;
  const [texto, setTexto] = useState(busca);

  const atualizar = (mudancas: Record<string, string>) =>
    setParams(
      (atual) => {
        const novos = new URLSearchParams(atual);
        for (const [chave, valor] of Object.entries(mudancas)) {
          if (valor) novos.set(chave, valor);
          else novos.delete(chave);
        }
        return novos;
      },
      { replace: true },
    );

  useEffect(() => {
    const termo = texto.trim();
    if (termo === busca) return;
    const espera = setTimeout(() => atualizar({ busca: termo }), ATRASO_BUSCA_MS);
    return () => clearTimeout(espera);
  // Só o que o usuário digita dispara a busca; mudanças da URL já chegam por `busca`.
  }, [texto]);

  const consulta = useInfiniteQuery({
    queryKey: ['pacientes', busca, status],
    queryFn: ({ pageParam }) => listarPacientes({ busca, status, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultima) => ultima.proximoCursor ?? undefined,
    placeholderData: keepPreviousData,
  });
  const pacientes = consulta.data?.pages.flatMap((p) => p.pacientes) ?? [];
  const filtrando = busca !== '' || status !== undefined;

  function limpar() {
    setTexto('');
    atualizar({ busca: '', status: '' });
  }

  return (
    <section className={pagina.tela} aria-labelledby="titulo-tela">
      <header className={pagina.cabecalho}>
        <h1 id="titulo-tela" className={pagina.titulo}>
          Pacientes
        </h1>
        <Button variante="text" icone={<Archive aria-hidden />} onPress={() => navigate('/pacientes/arquivadas')}>
          Anotações arquivadas
        </Button>
      </header>

      <div className={css.filtros}>
        <TextField
          rotulo="Buscar por nome"
          type="search"
          autoComplete="off"
          value={texto}
          onChange={setTexto}
        />
        <div className={pagina.secao}>
          <div role="group" aria-labelledby="rotulo-status" className={css.status}>
            <span id="rotulo-status" className={css.rotuloStatus}>
              Status de dados
            </span>
            {(Object.keys(STATUS_DADOS) as StatusDados[]).map((id) => (
              <ChipFiltro key={id} isSelected={status === id} onChange={(marcado) => atualizar({ status: marcado ? id : '' })}>
                {STATUS_DADOS[id]}
              </ChipFiltro>
            ))}
          </div>
          <p className={pagina.subtituloSecao}>
            O status conta só os registros dos últimos 7 dias: Ativo, 3 ou mais; Esparso, 1 ou 2; Sem registros, nenhum. É volume de
            dados, não um estado clínico.
          </p>
        </div>
      </div>

      {consulta.isError && !consulta.data ? (
        <EstadoErro erro={consulta.error} onTentar={() => void consulta.refetch()} titulo="Não foi possível carregar os pacientes" />
      ) : consulta.isPending ? (
        <div role="status" className={pagina.esqueleto}>
          <VisuallyHidden>Carregando pacientes</VisuallyHidden>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} forma="bloco" />
          ))}
        </div>
      ) : pacientes.length === 0 ? (
        filtrando ? (
          <EmptyState
            icone={<SearchX />}
            titulo={busca ? `Nenhum resultado para “${busca}”` : 'Nenhum paciente com esse status'}
            descricao="Confira a grafia ou tire os filtros para ver todos os pacientes vinculados."
            acao={
              <Button variante="tonal" onPress={limpar}>
                Limpar filtros
              </Button>
            }
          />
        ) : (
          <EmptyState
            icone={<UserPlus />}
            titulo="Nenhum paciente vinculado ainda"
            descricao="Gere um código de vínculo e passe ao paciente para ele aparecer aqui."
            acao={<Button onPress={() => navigate('/vinculo')}>Gerar código de vínculo</Button>}
          />
        )
      ) : (
        <>
          <VisuallyHidden role="status">{plural(pacientes.length, 'paciente listado', 'pacientes listados')}</VisuallyHidden>
          <div className={cx(linhas.raiz, css.colunas)} data-compacto={compacto}>
            <table className={linhas.tabela} aria-label="Pacientes vinculados" aria-busy={consulta.isFetching}>
              <thead className={linhas.cabecalho}>
                <tr className={linhas.grade}>
                  <th scope="col">Paciente</th>
                  <th scope="col">Último registro</th>
                  <th scope="col">Registros em 7 dias</th>
                  <th scope="col">Status de dados</th>
                </tr>
              </thead>
              <tbody className={linhas.lista}>
                {pacientes.map((paciente) => (
                  <tr key={paciente.id} className={cx(linhas.grade, linhas.linha)}>
                    <th scope="row">
                      <Link href={`/pacientes/${paciente.id}`} className={linhas.principal}>
                        {paciente.nome}
                      </Link>
                    </th>
                    {paciente.status === null ? (
                      <td colSpan={3} className={cx(linhas.celula, linhas.resto)}>
                        <Chip>
                          <EyeOff aria-hidden />
                          Não compartilha humor
                        </Chip>
                      </td>
                    ) : (
                      <>
                        <td className={linhas.celula}>
                          <span className={linhas.rotulo}>Último registro</span>
                          {paciente.ultimoCheckin ? (
                            <>
                              {formatarDia(paciente.ultimoCheckin.data)}
                              <Emocoes emocoes={paciente.ultimoCheckin.emocoes} />
                            </>
                          ) : (
                            'Nenhum registro'
                          )}
                        </td>
                        <td className={linhas.celula}>
                          <span className={linhas.rotulo}>Registros em 7 dias</span>
                          {paciente.registros7d}
                        </td>
                        <td className={linhas.celula}>
                          <span className={linhas.rotulo}>Status de dados</span>
                          <Chip>{STATUS_DADOS[paciente.status]}</Chip>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {consulta.hasNextPage && (
            <div className={pagina.mais}>
              <Button variante="outlined" isPending={consulta.isFetchingNextPage} onPress={() => void consulta.fetchNextPage()}>
                Carregar mais
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
