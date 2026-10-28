import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { VisuallyHidden } from 'react-aria-components';
import { ClipboardList } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ConsentimentoAusente } from '../../components/ui/ConsentimentoAusente';
import { Disclaimer } from '../../components/ui/Disclaimer';
import { EstadoErro } from '../../components/ui/EstadoErro';
import { Skeleton } from '../../components/ui/Skeleton';
import { listarAplicacoesDoPaciente } from '../../lib/psicologoApi';
import { AVISO_ESCALA } from '../../lib/rotulos';
import { Evolucao, porEscala } from '../escalas/Evolucao';
import { SolicitarEscala } from '../escalas/SolicitarEscala';
import { TabelaAplicacoes } from '../escalas/TabelaAplicacoes';
import pagina from '../Pagina.module.css';

export function AbaEscalas({ id, nome }: { id: number; nome: string }) {
  const [solicitando, setSolicitando] = useState(false);
  const consulta = useQuery({ queryKey: ['paciente', id, 'escalas'], queryFn: () => listarAplicacoesDoPaciente(id) });

  if (consulta.isError) {
    return <EstadoErro erro={consulta.error} onTentar={() => void consulta.refetch()} titulo="Não foi possível carregar as escalas" />;
  }
  if (consulta.isPending) {
    return (
      <div role="status" className={pagina.esqueleto}>
        <VisuallyHidden>Carregando as escalas</VisuallyHidden>
        <Skeleton forma="bloco" />
        <Skeleton forma="bloco" />
      </div>
    );
  }
  if (!consulta.data.consentimentos.escalas) {
    return <ConsentimentoAusente>O paciente não compartilha escalas.</ConsentimentoAusente>;
  }

  const { aplicacoes } = consulta.data;
  const series = porEscala(aplicacoes);

  return (
    <div className={pagina.secao}>
      <div className={pagina.cabecalho}>
        <div>
          <h2 className={pagina.tituloSecao}>Escalas</h2>
          <p className={pagina.subtituloSecao}>{AVISO_ESCALA}</p>
        </div>
        <Button icone={<ClipboardList />} onPress={() => setSolicitando(true)}>
          Solicitar escala
        </Button>
      </div>

      {aplicacoes.length === 0 ? (
        <p className={pagina.apoio}>Nenhuma escala solicitada a este paciente ainda.</p>
      ) : (
        <>
          {series.length > 0 && (
            <div className={pagina.grade}>
              {series.map((grupo) => (
                <Evolucao key={grupo[0]!.escala.sigla} grupo={grupo} />
              ))}
            </div>
          )}
          <TabelaAplicacoes aplicacoes={aplicacoes} rotulo={`Escalas de ${nome}`} />
        </>
      )}
      <Disclaimer />
      <SolicitarEscala isOpen={solicitando} onOpenChange={setSolicitando} paciente={{ id, nome }} />
    </div>
  );
}
