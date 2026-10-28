import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { VisuallyHidden } from 'react-aria-components';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { CalendarDate } from '@internationalized/date';
import { Button } from '../../components/ui/Button';
import { EstadoErro } from '../../components/ui/EstadoErro';
import { IconButton } from '../../components/ui/IconButton';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Skeleton } from '../../components/ui/Skeleton';
import { listarConsultas, type Consulta } from '../../lib/psicologoApi';
import pagina from '../Pagina.module.css';
import { deslocar, hoje, intervalo, lerDiaOuHoje, tituloDe, type Visao } from './agenda';
import { DetalheConsulta } from './DetalheConsulta';
import { GradeHoras } from './GradeHoras';
import { NovaConsulta } from './NovaConsulta';
import { VisaoMes } from './VisaoMes';
import css from './Calendario.module.css';

const VISOES: ReadonlyArray<{ id: Visao; rotulo: string; anterior: string; proximo: string }> = [
  { id: 'dia', rotulo: 'Dia', anterior: 'Dia anterior', proximo: 'Próximo dia' },
  { id: 'semana', rotulo: 'Semana', anterior: 'Semana anterior', proximo: 'Próxima semana' },
  { id: 'mes', rotulo: 'Mês', anterior: 'Mês anterior', proximo: 'Próximo mês' },
];

export default function Calendario() {
  const [params, setParams] = useSearchParams();
  const visaoAtual = VISOES.find((v) => v.id === params.get('visao')) ?? VISOES[1]!;
  const visao = visaoAtual.id;
  const dia = lerDiaOuHoje(params.get('dia'));
  const { de, ate } = intervalo(visao, dia);
  const [aberta, setAberta] = useState<Consulta | null>(null);
  const [criando, setCriando] = useState(false);

  const consulta = useQuery({
    queryKey: ['consultas', de.toString(), ate.toString()],
    queryFn: () => listarConsultas(de.toString(), ate.toString()),
    placeholderData: keepPreviousData,
  });

  const irPara = (novaVisao: Visao, novoDia: CalendarDate) =>
    setParams({ visao: novaVisao, dia: novoDia.toString() }, { replace: true });

  const dias = Array.from({ length: ate.compare(de) + 1 }, (_, i) => de.add({ days: i }));

  return (
    <section className={pagina.tela} aria-labelledby="titulo-tela">
      <header className={pagina.cabecalho}>
        <h1 id="titulo-tela" className={pagina.titulo}>
          Calendário
        </h1>
        <Button icone={<Plus />} onPress={() => setCriando(true)}>
          Nova consulta
        </Button>
      </header>

      <div className={css.barra}>
        <SegmentedControl
          aria-label="Visão do calendário"
          opcoes={VISOES.map(({ id, rotulo }) => ({ id, rotulo }))}
          valor={visao}
          onChange={(id) => irPara(id as Visao, dia)}
        />
        <div className={css.navegacao}>
          <IconButton aria-label={visaoAtual.anterior} icone={<ChevronLeft />} onPress={() => irPara(visao, deslocar(visao, dia, -1))} />
          <Button variante="outlined" onPress={() => irPara(visao, hoje())}>
            Hoje
          </Button>
          <IconButton aria-label={visaoAtual.proximo} icone={<ChevronRight />} onPress={() => irPara(visao, deslocar(visao, dia, 1))} />
        </div>
        <h2 className={css.titulo} aria-live="polite">
          {tituloDe(visao, dia)}
        </h2>
      </div>

      {consulta.isError && !consulta.data ? (
        <EstadoErro erro={consulta.error} onTentar={() => void consulta.refetch()} titulo="Não foi possível carregar a agenda" />
      ) : !consulta.data ? (
        <div role="status" className={pagina.esqueleto}>
          <VisuallyHidden>Carregando a agenda</VisuallyHidden>
          <Skeleton forma="bloco" />
          <Skeleton forma="bloco" />
        </div>
      ) : (
        <div className={css.agenda} aria-busy={consulta.isPlaceholderData}>
          {visao === 'mes' ? (
            <VisaoMes dia={dia} consultas={consulta.data} onFoco={(d) => irPara('mes', d)} onDia={(d) => irPara('dia', d)} />
          ) : (
            <GradeHoras dias={dias} consultas={consulta.data} onAbrir={setAberta} onDia={(d) => irPara('dia', d)} />
          )}
          {consulta.data.length === 0 && (
            <p className={css.vazio}>Nenhuma consulta neste período. Use “Nova consulta” para agendar.</p>
          )}
        </div>
      )}

      <DetalheConsulta consulta={aberta} onClose={() => setAberta(null)} />
      <NovaConsulta isOpen={criando} onOpenChange={setCriando} dia={dia} />
    </section>
  );
}
