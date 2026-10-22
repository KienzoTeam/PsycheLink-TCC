import { lazy, Suspense, useState, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { VisuallyHidden } from 'react-aria-components';
import { Check, EyeOff, UserX } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { DateRangePicker, ultimosDias, type Periodo } from '../../components/ui/DateRangePicker';
import { EmptyState } from '../../components/ui/EmptyState';
import { EstadoErro } from '../../components/ui/EstadoErro';
import { Skeleton } from '../../components/ui/Skeleton';
import { Tabs } from '../../components/ui/Tabs';
import { naoEncontrado } from '../../lib/erros';
import { formatarData } from '../../lib/formatar';
import { diaIso, diasDoPeriodo, MAX_DIAS_PERIODO } from '../../lib/periodo';
import { buscarResumo, listarHistoricoVinculos, type Consentimentos } from '../../lib/psicologoApi';
import pagina from '../Pagina.module.css';
import { Anotacoes } from './Anotacoes';
import { EncerrarVinculo } from './EncerrarVinculo';
import { LinhaDoTempo } from './LinhaDoTempo';
import css from './Perfil.module.css';

// Os gráficos (e o recharts) só carregam quando a aba é aberta.
const VisaoGeral = lazy(() => import('./VisaoGeral'));

const PERIODO_PADRAO_DIAS = 30;
const ABAS = ['visao-geral', 'linha-do-tempo', 'anotacoes'] as const;
const CATEGORIAS: ReadonlyArray<{ id: keyof Consentimentos; rotulo: string }> = [
  { id: 'humor', rotulo: 'Humor' },
  { id: 'habitos', rotulo: 'Hábitos' },
  { id: 'escalas', rotulo: 'Escalas' },
  { id: 'diario', rotulo: 'Diário' },
];

function EsqueletoAba() {
  return (
    <div role="status" className={pagina.grade}>
      <VisuallyHidden>Carregando</VisuallyHidden>
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} className={i === 0 ? pagina.largura : undefined}>
          <div className={pagina.esqueleto} aria-hidden>
            <Skeleton forma="titulo" />
            <Skeleton forma="bloco" />
          </div>
        </Card>
      ))}
    </div>
  );
}

// Estados de página inteira sem o cabeçalho do paciente: a página ainda precisa de um h1.
function PaginaSemPaciente({ children }: { children: ReactNode }) {
  return (
    <section className={pagina.tela} aria-labelledby="titulo-tela">
      <h1 id="titulo-tela" className={pagina.titulo}>
        Paciente
      </h1>
      {children}
    </section>
  );
}

export default function Perfil() {
  const navigate = useNavigate();
  const { id: idTexto } = useParams();
  const id = Number(idTexto);
  const [params, setParams] = useSearchParams();
  const abaParam = params.get('aba');
  const aba = ABAS.find((a) => a === abaParam) ?? ABAS[0];
  const [periodo, setPeriodo] = useState<Periodo | null>(() => ultimosDias(PERIODO_PADRAO_DIAS));
  const [comparar, setComparar] = useState<Periodo | null>(null);

  const periodoOk = periodo !== null && diasDoPeriodo(periodo) <= MAX_DIAS_PERIODO;
  const compararOk = comparar === null || diasDoPeriodo(comparar) <= MAX_DIAS_PERIODO;
  const idValido = Number.isInteger(id) && id > 0;
  const de = periodo ? diaIso(periodo.start) : '';
  const ate = periodo ? diaIso(periodo.end) : '';

  const consulta = useQuery({
    queryKey: ['paciente', id, 'resumo', de, ate, comparar && diaIso(comparar.start), comparar && diaIso(comparar.end)],
    queryFn: async () => ({
      resumo: await buscarResumo(id, {
        de,
        ate,
        ...(comparar && { compararDe: diaIso(comparar.start), compararAte: diaIso(comparar.end) }),
      }),
      de,
      ate,
    }),
    enabled: idValido && periodoOk && compararOk,
    placeholderData: keepPreviousData,
  });
  const historico = useQuery({ queryKey: ['vinculo', 'historico'], queryFn: listarHistoricoVinculos });

  if (!idValido || naoEncontrado(consulta.error)) {
    return (
      <PaginaSemPaciente>
        <Card>
          <EmptyState
            icone={<UserX />}
            titulo="Paciente não encontrado"
            descricao="O vínculo pode ter sido encerrado ou o endereço está incorreto."
            acao={<Button onPress={() => navigate('/pacientes')}>Voltar para Pacientes</Button>}
          />
        </Card>
      </PaginaSemPaciente>
    );
  }
  if (consulta.isError && !consulta.data) {
    return (
      <PaginaSemPaciente>
        <EstadoErro erro={consulta.error} onTentar={() => void consulta.refetch()} titulo="Não foi possível carregar o paciente" />
      </PaginaSemPaciente>
    );
  }

  const dados = consulta.data;
  const paciente = dados?.resumo.paciente;
  const vinculadoEm = historico.data?.find((v) => v.pacienteId === id && v.status === 'ativo')?.vinculadoEm;

  return (
    <section className={pagina.tela} aria-labelledby="titulo-tela">
      <header className={pagina.cabecalho}>
        <div>
          <h1 id="titulo-tela" className={pagina.titulo}>
            {paciente ? (
              paciente.nome
            ) : (
              <>
                <Skeleton forma="titulo" />
                <VisuallyHidden elementType="span">Carregando paciente</VisuallyHidden>
              </>
            )}
          </h1>
          {vinculadoEm && <p className={pagina.apoio}>Vinculado desde {formatarData(vinculadoEm)}</p>}
        </div>
        {paciente && <EncerrarVinculo paciente={paciente} />}
      </header>

      {dados && (
        <ul className={css.consentimentos} aria-label="O que o paciente compartilha">
          {CATEGORIAS.map(({ id: categoria, rotulo }) => {
            const compartilha = dados.resumo.consentimentos[categoria];
            return (
              <li key={categoria}>
                <Chip>
                  {compartilha ? <Check aria-hidden /> : <EyeOff aria-hidden />}
                  {rotulo} · {compartilha ? 'Compartilha' : 'Não compartilha'}
                </Chip>
              </li>
            );
          })}
        </ul>
      )}

      <DateRangePicker valor={periodo} onChange={setPeriodo} />
      {!periodoOk && (
        <p role="alert" className={css.erro}>
          Escolha um período de até {MAX_DIAS_PERIODO} dias, com início e fim.
        </p>
      )}

      <Tabs
        aria-label="Seções do paciente"
        selectedKey={aba}
        onSelectionChange={(chave) =>
          setParams(
            (atual) => {
              const novos = new URLSearchParams(atual);
              novos.set('aba', String(chave));
              return novos;
            },
            { replace: true },
          )
        }
        abas={[
          {
            id: 'visao-geral',
            rotulo: 'Visão geral',
            painel: dados ? (
              <Suspense fallback={<EsqueletoAba />}>
                <VisaoGeral resumo={dados.resumo} de={dados.de} ate={dados.ate} comparar={comparar} onComparar={setComparar} />
              </Suspense>
            ) : (
              <EsqueletoAba />
            ),
          },
          { id: 'linha-do-tempo', rotulo: 'Linha do tempo', painel: periodoOk ? <LinhaDoTempo id={id} de={de} ate={ate} /> : null },
          { id: 'anotacoes', rotulo: 'Anotações privadas', painel: <Anotacoes id={id} /> },
        ]}
      />
    </section>
  );
}
