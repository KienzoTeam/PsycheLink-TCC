import { useQuery } from '@tanstack/react-query';
import { VisuallyHidden } from 'react-aria-components';
import { Chip } from '../../components/ui/Chip';
import { ConsentimentoAusente } from '../../components/ui/ConsentimentoAusente';
import { Emocoes } from '../../components/ui/Emocoes';
import { EstadoErro } from '../../components/ui/EstadoErro';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatarNumero } from '../../lib/formatar';
import { buscarCheckin } from '../../lib/psicologoApi';
import { HABITOS, rotuloGatilho } from '../../lib/rotulos';
import css from './DetalheCheckin.module.css';

const intensidade = (valor: number | null) => (valor === null ? 'Sem dado' : `${valor} de 10`);
const simNao = (valor: boolean) => (valor ? 'Sim' : 'Não');

// Registro completo, só com as categorias que o paciente compartilha. Cada consulta é um acesso registrado na auditoria.
export function DetalheCheckin({ id }: { id: number }) {
  const consulta = useQuery({ queryKey: ['checkin', id], queryFn: () => buscarCheckin(id) });

  if (consulta.isPending) {
    return (
      <div role="status" className={css.detalhe}>
        <VisuallyHidden>Carregando o registro</VisuallyHidden>
        <Skeleton forma="titulo" />
        <Skeleton forma="bloco" />
        <Skeleton />
      </div>
    );
  }
  if (consulta.isError) {
    return <EstadoErro erro={consulta.error} onTentar={() => void consulta.refetch()} titulo="Não foi possível carregar o registro" />;
  }

  const { checkin: c, consentimentos } = consulta.data;
  const { habitos } = c;
  return (
    <div className={css.detalhe}>
      <section className={css.bloco}>
        <h3 className={css.titulo}>Humor e emoções</h3>
        <dl className={css.pares}>
          <div>
            <dt>Humor</dt>
            <dd>{intensidade(c.humor)}</dd>
          </div>
          <div>
            <dt>Ansiedade</dt>
            <dd>{intensidade(c.ansiedade)}</dd>
          </div>
          <div>
            <dt>Intensidade da emoção</dt>
            <dd>{intensidade(c.intensidadeEmocao)}</dd>
          </div>
        </dl>
        <Emocoes emocoes={c.emocoes} />
        <h4 className={css.subtitulo}>Gatilhos informados</h4>
        {c.gatilhos?.length ? (
          <ul className={css.chips}>
            {c.gatilhos.map((gatilho) => (
              <li key={gatilho}>
                <Chip>{rotuloGatilho(gatilho)}</Chip>
              </li>
            ))}
          </ul>
        ) : (
          <p className={css.nota}>Nenhum gatilho informado.</p>
        )}
      </section>

      <section className={css.bloco}>
        <h3 className={css.titulo}>Sono e hábitos</h3>
        {consentimentos.habitos ? (
          <>
            <dl className={css.pares}>
              <div>
                <dt>Horas de sono</dt>
                <dd>{c.sonoHoras === null ? 'Sem dado' : `${formatarNumero(c.sonoHoras)} h`}</dd>
              </div>
              <div>
                <dt>Qualidade do sono, segundo o paciente</dt>
                <dd>{c.qualidadeSono ?? 'Sem dado'}</dd>
              </div>
            </dl>
            {habitos ? (
              <dl className={css.pares}>
                {HABITOS.map(({ chave, rotulo }) => (
                  <div key={chave}>
                    <dt>{rotulo}</dt>
                    <dd>{simNao(habitos[chave])}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className={css.nota}>Nenhum hábito registrado neste dia.</p>
            )}
          </>
        ) : (
          <ConsentimentoAusente />
        )}
      </section>

      <section className={css.bloco}>
        <h3 className={css.titulo}>Diário</h3>
        {c.diario ? (
          <figure className={css.diario}>
            <figcaption>Texto escrito pelo paciente</figcaption>
            <blockquote>{c.diario}</blockquote>
          </figure>
        ) : (
          <p className={css.nota}>O paciente não compartilhou o diário deste registro.</p>
        )}
      </section>
    </div>
  );
}
