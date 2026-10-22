import { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { VisuallyHidden } from 'react-aria-components';
import { CalendarPlus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EstadoErro } from '../../components/ui/EstadoErro';
import { ListItem } from '../../components/ui/ListItem';
import { Skeleton } from '../../components/ui/Skeleton';
import { StatusConsulta } from '../../components/ui/StatusConsulta';
import { formatarDataHora, formatarHora } from '../../lib/formatar';
import { listarConsultas, type Consulta } from '../../lib/psicologoApi';
import { hoje } from '../calendario/agenda';
import { DetalheConsulta } from '../calendario/DetalheConsulta';
import { NovaConsulta } from '../calendario/NovaConsulta';
import pagina from '../Pagina.module.css';

// O servidor limita a agenda a 92 dias por consulta: a aba olha 92 dias para trás e 92 para a frente.
const DIAS_POR_LADO = 92;

function Grupo({ titulo, vazio, consultas, onAbrir }: { titulo: string; vazio: string; consultas: Consulta[]; onAbrir: (c: Consulta) => void }) {
  return (
    <Card>
      <div className={pagina.secao}>
        <h3 className={pagina.tituloSecao}>{titulo}</h3>
        {consultas.length === 0 ? (
          <p className={pagina.apoio}>{vazio}</p>
        ) : (
          <ul>
            {consultas.map((c) => (
              <ListItem
                key={c.id}
                titulo={formatarDataHora(c.inicio)}
                apoio={`até ${formatarHora(c.fim)}`}
                fim={<StatusConsulta status={c.status} />}
                onPress={() => onAbrir(c)}
              />
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

export function AbaConsultas({ id, nome }: { id: number; nome: string }) {
  const [aberta, setAberta] = useState<Consulta | null>(null);
  const [agendando, setAgendando] = useState(false);
  const [dia] = useState(hoje);

  const janelas = [
    { de: dia.subtract({ days: DIAS_POR_LADO - 1 }), ate: dia },
    { de: dia.add({ days: 1 }), ate: dia.add({ days: DIAS_POR_LADO }) },
  ];
  const consultas = useQueries({
    queries: janelas.map(({ de, ate }) => ({
      queryKey: ['consultas', de.toString(), ate.toString()],
      queryFn: () => listarConsultas(de.toString(), ate.toString()),
    })),
  });

  const erro = consultas.find((c) => c.isError);
  const doPaciente = consultas.flatMap((c) => c.data ?? []).filter((c) => c.pacienteId === id);
  const agora = Date.now();
  const proximas = doPaciente.filter((c) => c.status === 'agendada' && Date.parse(c.fim) > agora);
  const anteriores = doPaciente.filter((c) => !proximas.includes(c)).sort((a, b) => b.inicio.localeCompare(a.inicio));

  return (
    <div className={pagina.secao}>
      <div className={pagina.cabecalho}>
        <div>
          <h2 className={pagina.tituloSecao}>Consultas</h2>
          <p className={pagina.subtituloSecao}>Os últimos e os próximos {DIAS_POR_LADO} dias.</p>
        </div>
        <Button icone={<CalendarPlus />} onPress={() => setAgendando(true)}>
          Agendar consulta
        </Button>
      </div>

      {erro ? (
        <EstadoErro erro={erro.error} onTentar={() => consultas.forEach((c) => void c.refetch())} titulo="Não foi possível carregar as consultas" />
      ) : consultas.some((c) => c.isPending) ? (
        <div role="status" className={pagina.esqueleto}>
          <VisuallyHidden>Carregando as consultas</VisuallyHidden>
          <Skeleton forma="bloco" />
          <Skeleton forma="bloco" />
        </div>
      ) : (
        <div className={pagina.grade}>
          <Grupo titulo="Próximas" vazio="Nenhuma consulta agendada." consultas={proximas} onAbrir={setAberta} />
          <Grupo titulo="Anteriores" vazio="Nenhuma consulta no período." consultas={anteriores} onAbrir={setAberta} />
        </div>
      )}

      <DetalheConsulta consulta={aberta} onClose={() => setAberta(null)} />
      <NovaConsulta isOpen={agendando} onOpenChange={setAgendando} dia={dia} paciente={{ id, nome }} />
    </div>
  );
}
