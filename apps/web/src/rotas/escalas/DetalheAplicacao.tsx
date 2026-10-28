import { isAxiosError } from 'axios';
import { useQuery } from '@tanstack/react-query';
import { VisuallyHidden } from 'react-aria-components';
import { ConsentimentoAusente } from '../../components/ui/ConsentimentoAusente';
import { Disclaimer } from '../../components/ui/Disclaimer';
import { EstadoErro } from '../../components/ui/EstadoErro';
import { MarcadorItem9 } from '../../components/ui/MarcadorItem9';
import { ScoreBruto } from '../../components/ui/ScoreBruto';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatarDataHora } from '../../lib/formatar';
import { buscarAplicacao } from '../../lib/psicologoApi';
import { AVISO_ESCALA, STATUS_APLICACAO } from '../../lib/rotulos';
import pagina from '../Pagina.module.css';
import css from './Escalas.module.css';

// A ordem das subescalas da DASS-21; o servidor devolve as chaves em ordem alfabética.
const ORDEM_SUBESCALAS = ['depressao', 'ansiedade', 'estresse'];

export function DetalheAplicacao({ id }: { id: number }) {
  const consulta = useQuery({ queryKey: ['aplicacoes', 'detalhe', id], queryFn: () => buscarAplicacao(id) });

  if (consulta.isError) {
    if (isAxiosError(consulta.error) && consulta.error.response?.status === 403) {
      return <ConsentimentoAusente>O paciente não compartilha escalas.</ConsentimentoAusente>;
    }
    return <EstadoErro erro={consulta.error} onTentar={() => void consulta.refetch()} titulo="Não foi possível carregar a aplicação" />;
  }
  if (consulta.isPending) {
    return (
      <div role="status" className={pagina.esqueleto}>
        <VisuallyHidden>Carregando a aplicação</VisuallyHidden>
        <Skeleton forma="titulo" />
        <Skeleton forma="bloco" />
      </div>
    );
  }

  const { escala, status, scoreTotal, subscores, subescalas, itens, item9DiferenteDeZero, respondidoEm } = consulta.data;
  // As subescalas têm o mesmo número de itens e o mesmo teto: o máximo de cada uma é a fração do total.
  const maximoSubescala = subescalas ? escala.pontuacaoMaxima / Object.keys(subescalas).length : 0;

  return (
    <div className={css.detalhe}>
      <div>
        <p className={css.escalaNome}>{escala.nome}</p>
        {respondidoEm && <p className={css.apoio}>Respondida em {formatarDataHora(respondidoEm)}</p>}
      </div>

      {status === 'concluida' && scoreTotal !== null ? (
        <>
          <section aria-labelledby={`escore-${id}`} className={css.escore}>
            <h3 id={`escore-${id}`} className={css.rotuloEscore}>
              Escore bruto
            </h3>
            <ScoreBruto valor={scoreTotal} maximo={escala.pontuacaoMaxima} />
            {subescalas && subscores && (
              <dl className={css.subescalas}>
                {Object.keys(subescalas)
                  .sort((a, b) => ORDEM_SUBESCALAS.indexOf(a) - ORDEM_SUBESCALAS.indexOf(b))
                  .map((chave) => (
                    <div key={chave}>
                      <dt>{subescalas[chave]!.rotulo}</dt>
                      <dd>
                        {subscores[chave]} de {maximoSubescala}
                      </dd>
                    </div>
                  ))}
              </dl>
            )}
            {item9DiferenteDeZero && <MarcadorItem9 />}
          </section>

          <section aria-labelledby={`itens-${id}`} className={css.itens}>
            <h3 id={`itens-${id}`} className={css.rotuloEscore}>
              Respostas por item
            </h3>
            <ol>
              {itens.map((item) => (
                <li key={item.numero}>
                  <p>
                    {item.numero}. {item.enunciado}
                  </p>
                  <p className={css.resposta}>
                    {item.resposta === null ? 'Sem resposta' : `${item.rotuloResposta ?? 'Resposta'}, valor ${item.resposta}`}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </>
      ) : (
        <p className={css.apoio}>
          Situação: {STATUS_APLICACAO[status].toLowerCase()}. O escore e as respostas por item aparecem quando o paciente conclui a escala.
        </p>
      )}

      <Disclaimer>{AVISO_ESCALA}</Disclaimer>
      <Disclaimer />
    </div>
  );
}
