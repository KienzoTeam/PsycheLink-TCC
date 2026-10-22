import { useId, useState } from 'react';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { Button as BotaoAria, VisuallyHidden } from 'react-aria-components';
import { CalendarClock, ChevronDown, ClipboardList, Info, Link2, MapPinCheck, type LucideIcon } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Colapsavel } from '../../components/ui/Colapsavel';
import { ConsentimentoAusente } from '../../components/ui/ConsentimentoAusente';
import { Emocoes } from '../../components/ui/Emocoes';
import { EstadoErro } from '../../components/ui/EstadoErro';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatarCheckin, formatarDataHora, formatarNumero } from '../../lib/formatar';
import { ehCheckinTempo, listarLinhaDoTempo, type ItemCheckinTempo, type ItemEventoTempo } from '../../lib/psicologoApi';
import { rotuloAcao, STATUS_CONSULTA } from '../../lib/rotulos';
import { DetalheCheckin } from '../checkins/DetalheCheckin';
import pagina from '../Pagina.module.css';
import css from './LinhaDoTempo.module.css';

const ICONES: Record<string, LucideIcon> = {
  vinculo_criado: Link2,
  vinculo_encerrado: Link2,
  escala_solicitada: ClipboardList,
  escala_respondida: ClipboardList,
  consulta: CalendarClock,
};

// Texto próprio de cada evento; o tipo desconhecido cai no rótulo neutro.
function descrever(item: ItemEventoTempo) {
  const quando = formatarDataHora(item.em);
  switch (item.tipo) {
    case 'escala_solicitada':
      return { titulo: `Escala ${item.sigla} solicitada`, apoio: quando };
    case 'escala_respondida':
      return { titulo: `Escala ${item.sigla} respondida`, apoio: `Escore bruto ${item.scoreTotal} · ${quando}` };
    case 'consulta':
      return { titulo: `Consulta ${item.status ? STATUS_CONSULTA[item.status].toLowerCase() : ''}`.trim(), apoio: quando };
    default:
      return { titulo: rotuloAcao(item.tipo), apoio: quando };
  }
}

function Checkin({ item }: { item: ItemCheckinTempo }) {
  const [aberto, setAberto] = useState(false);
  // Depois da primeira abertura o detalhe fica montado: reabrir não refaz a consulta.
  const [visto, setVisto] = useState(false);
  const painel = useId();
  const resumo = [
    item.humor !== null && `Humor ${item.humor} de 10`,
    item.ansiedade !== null && `Ansiedade ${item.ansiedade} de 10`,
    item.sonoHoras !== null && `Sono ${formatarNumero(item.sonoHoras)} h`,
  ].filter(Boolean);

  return (
    <li className={css.item}>
      <MapPinCheck aria-hidden className={css.icone} />
      <div className={css.corpo}>
        <BotaoAria
          className={css.titulo}
          aria-expanded={aberto}
          aria-controls={painel}
          onPress={() => {
            setAberto(!aberto);
            setVisto(true);
          }}
        >
          <span>Check-in, {formatarCheckin(item.data, item.horario)}</span>
          <ChevronDown aria-hidden className={css.seta} data-aberto={aberto} />
        </BotaoAria>
        <Emocoes emocoes={item.emocoes} />
        {resumo.length > 0 && <p className={css.resumo}>{resumo.join(' · ')}</p>}
        <div id={painel}>
          <Colapsavel aberto={aberto}>{visto && <DetalheCheckin id={item.id} />}</Colapsavel>
        </div>
      </div>
    </li>
  );
}

type Props = { id: number; de: string; ate: string };

export function LinhaDoTempo({ id, de, ate }: Props) {
  const consulta = useInfiniteQuery({
    queryKey: ['paciente', id, 'linha-do-tempo', de, ate],
    queryFn: ({ pageParam }) => listarLinhaDoTempo(id, { de, ate, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultima) => ultima.proximoCursor ?? undefined,
    placeholderData: keepPreviousData,
  });

  if (consulta.isError && !consulta.data) {
    return <EstadoErro erro={consulta.error} onTentar={() => void consulta.refetch()} titulo="Não foi possível carregar a linha do tempo" />;
  }
  if (consulta.isPending) {
    return (
      <div role="status" className={pagina.esqueleto}>
        <VisuallyHidden>Carregando a linha do tempo</VisuallyHidden>
        <Skeleton forma="bloco" />
        <Skeleton forma="bloco" />
      </div>
    );
  }

  const itens = consulta.data.pages.flatMap((p) => p.itens);
  const { consentimentos } = consulta.data.pages[0]!;

  return (
    <div className={pagina.secao} aria-busy={consulta.isFetching}>
      <VisuallyHidden elementType="h2">Linha do tempo</VisuallyHidden>
      {!consentimentos.humor && <ConsentimentoAusente />}
      {itens.length === 0 ? (
        <p className={pagina.apoio}>Nenhum registro neste período.</p>
      ) : (
        <ol className={css.lista}>
          {itens.map((item) => {
            if (ehCheckinTempo(item)) return <Checkin key={`checkin-${item.id}`} item={item} />;
            const Icone = ICONES[item.tipo] ?? Info;
            const { titulo, apoio } = descrever(item);
            return (
              <li key={`${item.tipo}-${item.em}`} className={css.item}>
                <Icone aria-hidden className={css.icone} />
                <div className={css.corpo}>
                  <p className={css.evento}>{titulo}</p>
                  <p className={css.resumo}>{apoio}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {consulta.hasNextPage && (
        <div className={pagina.mais}>
          <Button variante="outlined" isPending={consulta.isFetchingNextPage} onPress={() => void consulta.fetchNextPage()}>
            Carregar mais
          </Button>
        </div>
      )}
    </div>
  );
}
