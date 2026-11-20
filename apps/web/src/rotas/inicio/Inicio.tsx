import { useState } from 'react';
import { useNavigate } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { VisuallyHidden } from 'react-aria-components';
import { UserPlus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Disclaimer } from '../../components/ui/Disclaimer';
import { Emocoes } from '../../components/ui/Emocoes';
import { EmptyState } from '../../components/ui/EmptyState';
import { EstadoErro } from '../../components/ui/EstadoErro';
import { ListItem } from '../../components/ui/ListItem';
import { MarcadorItem9 } from '../../components/ui/MarcadorItem9';
import { ScrollFade } from '../../components/ui/ScrollFade';
import { Select } from '../../components/ui/Select';
import { Skeleton } from '../../components/ui/Skeleton';
import { StatusConsulta } from '../../components/ui/StatusConsulta';
import { cx } from '../../lib/cx';
import { formatarDataHora, formatarDia, formatarHora, formatarNumero, formatarVariacao, plural } from '../../lib/formatar';
import { buscarDashboard, type Dashboard, type VariacaoSemanal } from '../../lib/psicologoApi';
import { rotuloAcao, rotuloEmocao } from '../../lib/rotulos';
import pagina from '../Pagina.module.css';
import { Sparkline } from './Sparkline';
import css from './Inicio.module.css';

const PERIODOS = [7, 30, 90].map((dias) => ({ id: String(dias), rotulo: `Últimos ${dias} dias` }));

const noPaciente = (id: number) => `/pacientes/${id}`;

function Engajamento({ engajamento }: { engajamento: Dashboard['engajamento'] }) {
  const { ativos, compartilhando } = engajamento;
  return (
    <Card>
      <h2 className={css.tituloCartao}>Engajamento</h2>
      {compartilhando === 0 ? (
        <p className={css.vazio}>Nenhum paciente compartilha humor ainda. O engajamento conta só quem compartilha.</p>
      ) : (
        <>
          <p className={css.numeroMedio}>
            {ativos} de {compartilhando}
          </p>
          <p className={css.legenda}>
            {compartilhando === 1 ? 'paciente' : 'pacientes'} com 3 ou mais check-ins nos últimos 7 dias.
          </p>
        </>
      )}
      <p className={css.definicao}>Conta os pacientes vinculados que compartilham humor.</p>
    </Card>
  );
}

function Alertas({ alertas }: { alertas: Dashboard['alertas'] }) {
  const linhas = [
    { rotulo: 'Poucos registros', valor: plural(alertas.esparsos, 'paciente', 'pacientes'), apoio: 'Menos de 3 check-ins nos últimos 7 dias.' },
    { rotulo: 'Uso do SOS', valor: plural(alertas.sos.usos, 'uso', 'usos'), apoio: 'Acessos ao SOS nos últimos 7 dias, só de quem compartilha o SOS.' },
    { rotulo: 'Escalas não abertas', valor: plural(alertas.escalasNaoVistas, 'escala', 'escalas'), apoio: 'Respondidas, com o detalhe ainda não aberto por você.' },
  ];
  return (
    <Card>
      <h2 className={css.tituloCartao}>Alertas ativos</h2>
      <p className={css.numeroMedio}>{alertas.total}</p>
      <p className={css.legenda}>Soma dos três itens abaixo. É uma contagem, não uma avaliação de risco.</p>
      <dl className={css.definicoes}>
        {linhas.map((linha) => (
          <div key={linha.rotulo}>
            <dt>{linha.rotulo}</dt>
            <dd>{linha.valor}</dd>
            <dd className={css.apoio}>{linha.apoio}</dd>
          </div>
        ))}
      </dl>
      {alertas.sos.pacientes.length > 0 && (
        <>
          <h3 className={css.subtitulo}>Quem usou o SOS</h3>
          <ul>
            {alertas.sos.pacientes.map((item) => (
              <ListItem
                key={item.pacienteId}
                href={noPaciente(item.pacienteId)}
                titulo={item.nome}
                apoio={`${plural(item.usos, 'uso', 'usos')} em 7 dias`}
              />
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

function Variacao({ rotulo, dados, unidade }: { rotulo: string; dados: VariacaoSemanal; unidade: string }) {
  const { atual, anterior, variacao } = dados;
  return (
    <div>
      <dt>{rotulo}</dt>
      <dd>{atual === null ? 'Sem dado' : `${formatarNumero(atual)} ${unidade}`}</dd>
      <dd className={css.apoio}>
        Semana anterior: {anterior === null ? 'sem dado' : formatarNumero(anterior)}.
        {variacao !== null && ` Variação: ${formatarVariacao(variacao)}.`}
      </dd>
    </div>
  );
}

function Insights({ insights }: { insights: Dashboard['insightsSemana'] }) {
  const { registros, humor, ansiedade, emocoes } = insights;
  const [principal, ...outras] = emocoes;
  return (
    <Card className={pagina.largura}>
      <h2 className={css.tituloCartao}>Insights da semana</h2>
      <p className={css.legenda}>
        Os últimos 7 dias contra os 7 anteriores, dos pacientes que compartilham humor. A variação é só a diferença entre os números.
      </p>
      {registros.atual === 0 && registros.anterior === 0 ? (
        <p className={css.vazio}>Nenhum registro nas duas semanas. Os insights aparecem quando houver check-ins.</p>
      ) : (
        <dl className={css.insights}>
          <Variacao rotulo="Humor médio do grupo" dados={humor} unidade="de 10" />
          <Variacao rotulo="Ansiedade média do grupo" dados={ansiedade} unidade="de 10" />
          <div>
            <dt>Check-ins na semana</dt>
            <dd>{registros.atual}</dd>
            <dd className={css.apoio}>
              Semana anterior: {registros.anterior}. Variação: {formatarVariacao(registros.atual - registros.anterior)}.
            </dd>
          </div>
          <div>
            <dt>Emoção mais frequente</dt>
            <dd>{principal ? rotuloEmocao(principal.emocao) : 'Sem dado'}</dd>
            <dd className={css.apoio}>
              {principal
                ? `Em ${plural(principal.quantidade, 'check-in', 'check-ins')} de ${registros.atual}.${outras.length > 0 ? ` Depois: ${outras.map((e) => `${rotuloEmocao(e.emocao)} (${e.quantidade})`).join(', ')}.` : ''}`
                : 'Nenhuma emoção registrada nos últimos 7 dias.'}
            </dd>
          </div>
        </dl>
      )}
      <Disclaimer />
    </Card>
  );
}

function Vinculados({ dados, periodo }: { dados: Dashboard; periodo: number }) {
  const { serieVinculos } = dados;
  const primeiro = serieVinculos[0];
  const ultimo = serieVinculos.at(-1);
  return (
    <Card className={css.vinculados}>
      <div>
        <h2 className={css.tituloCartao}>
          Pacientes vinculados
        </h2>
        <p className={css.numero}>{dados.pacientesVinculados}</p>
      </div>
      <div className={css.serie}>
        {primeiro && ultimo && (
          <Sparkline
            serie={serieVinculos}
            aria-label={`Vínculos ativos por dia: ${primeiro.total} em ${formatarDia(primeiro.data)} e ${ultimo.total} em ${formatarDia(ultimo.data)}`}
          />
        )}
        <p className={css.legenda}>Vínculos ativos por dia, últimos {periodo} dias</p>
      </div>
    </Card>
  );
}

function ResumoCheckins({ itens }: { itens: Dashboard['checkinsRecentes'] }) {
  return (
    <Card>
      <h2 className={css.tituloCartao}>
        Resumo de check-ins
      </h2>
      <p className={css.legenda}>Registros mais recentes dos pacientes que compartilham humor.</p>
      {itens.length === 0 ? (
        <p className={css.vazio}>Nenhum check-in ainda. Os registros aparecem aqui quando um paciente que compartilha humor fizer check-in.</p>
      ) : (
        <ul>
          {itens.map((item) => (
            <ListItem
              key={`${item.pacienteId}-${item.em}`}
              href={noPaciente(item.pacienteId)}
              titulo={item.nome}
              apoio={formatarDataHora(item.em)}
              fim={<Emocoes emocoes={item.emocoes} />}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

function Atividades({ itens }: { itens: Dashboard['atividadeRecente'] }) {
  return (
    <Card>
      <h2 className={css.tituloCartao}>
        Atividades recentes
      </h2>
      {itens.length === 0 ? (
        <p className={css.vazio}>Nenhuma atividade dos pacientes ainda.</p>
      ) : (
        <ScrollFade aria-label="Lista de atividades recentes">
          <ul>
            {itens.map((item) => (
              <ListItem
                key={`${item.pacienteId}-${item.acao}-${item.em}`}
                href={noPaciente(item.pacienteId)}
                titulo={item.nome}
                apoio={`${rotuloAcao(item.acao)} · ${formatarDataHora(item.em)}`}
              />
            ))}
          </ul>
        </ScrollFade>
      )}
    </Card>
  );
}

function DadosInsuficientes({ itens }: { itens: Dashboard['dadosInsuficientes'] }) {
  return (
    <Card>
      <h2 className={css.tituloCartao}>
        Dados insuficientes
      </h2>
      <p className={css.legenda}>Pacientes com menos de 3 registros nos últimos 7 dias.</p>
      {itens.length === 0 ? (
        <p className={css.vazio}>Nenhum paciente nessa situação.</p>
      ) : (
        <ul>
          {itens.map((item) => (
            <ListItem
              key={item.pacienteId}
              href={noPaciente(item.pacienteId)}
              titulo={item.nome}
              apoio={`${plural(item.registros7d, 'registro', 'registros')} em 7 dias`}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

function Medias({ medias, periodo }: { medias: Dashboard['medias']; periodo: number }) {
  const valor = (numero: number | null, unidade: string) => (numero === null ? 'Sem dado' : `${formatarNumero(numero)} ${unidade}`);
  return (
    <Card>
      <h2 className={css.tituloCartao}>
        Médias do grupo
      </h2>
      <p className={css.legenda}>
        Pacientes que compartilham humor, últimos {periodo} dias. n = {plural(medias.n, 'registro', 'registros')}.
      </p>
      {medias.n === 0 ? (
        <p className={css.vazio}>Nenhum registro no período.</p>
      ) : (
        <dl className={css.medias}>
          <div>
            <dt>Humor</dt>
            <dd>{valor(medias.humor, 'de 10')}</dd>
          </div>
          <div>
            <dt>Ansiedade</dt>
            <dd>{valor(medias.ansiedade, 'de 10')}</dd>
          </div>
          <div>
            <dt>Sono</dt>
            <dd>{valor(medias.sono, 'h')}</dd>
          </div>
        </dl>
      )}
    </Card>
  );
}

function ConsultasHoje({ itens }: { itens: Dashboard['consultasHoje'] }) {
  return (
    <Card>
      <h2 className={css.tituloCartao}>Consultas de hoje</h2>
      {itens.length === 0 ? (
        <p className={css.vazio}>Nenhuma consulta hoje. A agenda do dia aparece aqui quando houver consultas marcadas.</p>
      ) : (
        <ul>
          {itens.map((item) => (
            <ListItem
              key={item.id}
              href={`${noPaciente(item.pacienteId)}?aba=consultas`}
              titulo={item.nome}
              apoio={`${formatarHora(item.inicio)} às ${formatarHora(item.fim)}`}
              fim={
                <span className={css.marcas}>
                  {item.escalasParaRever > 0 && <Chip>{plural(item.escalasParaRever, 'escala para rever', 'escalas para rever')}</Chip>}
                  <StatusConsulta status={item.status} />
                </span>
              }
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

function Escalas({ escalas, naoVistas }: { escalas: Dashboard['escalas']; naoVistas: number }) {
  const { pendentes, respondidasRecentes } = escalas;
  return (
    <Card>
      <h2 className={css.tituloCartao}>Escalas</h2>
      <p className={css.legenda}>
        {pendentes === 0 ? 'Nenhuma escala aguardando resposta.' : `${plural(pendentes, 'escala aguardando', 'escalas aguardando')} resposta.`}{' '}
        {naoVistas === 0 ? 'Todas as respondidas já foram abertas.' : `${plural(naoVistas, 'respondida ainda não aberta', 'respondidas ainda não abertas')}.`}
      </p>
      {respondidasRecentes.length === 0 ? (
        <p className={css.vazio}>Nenhuma escala respondida ainda. O escore bruto aparece aqui quando um paciente responder.</p>
      ) : (
        <ul>
          {respondidasRecentes.map((item) => (
            <ListItem
              key={item.aplicacaoId}
              href={`${noPaciente(item.pacienteId)}?aba=escalas`}
              titulo={`${item.sigla}, ${item.nome}`}
              apoio={`Escore bruto ${item.scoreTotal} · ${formatarDataHora(item.respondidoEm)}`}
              fim={
                item.vista && !item.item9DiferenteDeZero ? undefined : (
                  <span className={css.marcas}>
                    {!item.vista && <Chip>Não aberta</Chip>}
                    {item.item9DiferenteDeZero && <MarcadorItem9 />}
                  </span>
                )
              }
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

function Carregando() {
  return (
    <div role="status" className={pagina.grade}>
      <VisuallyHidden>Carregando o painel</VisuallyHidden>
      {[0, 1].map((coluna) => (
        <div key={coluna} className={css.coluna} aria-hidden>
          <Card>
            <div className={pagina.esqueleto}>
              <Skeleton forma="titulo" />
              <Skeleton forma="bloco" />
            </div>
          </Card>
          <Card>
            <div className={pagina.esqueleto}>
              <Skeleton forma="titulo" />
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
}

export default function Inicio() {
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState(30);
  const consulta = useQuery({
    queryKey: ['dashboard', periodo],
    queryFn: () => buscarDashboard(periodo),
    placeholderData: keepPreviousData,
  });
  const dados = consulta.data;
  const comPacientes = dados !== undefined && dados.pacientesVinculados > 0;

  return (
    <section className={pagina.tela} aria-labelledby="titulo-tela">
      <header className={pagina.cabecalho}>
        <h1 id="titulo-tela" className={pagina.titulo}>
          Início
        </h1>
        {comPacientes && (
          <div className={css.filtro}>
            <Select rotulo="Período" opcoes={PERIODOS} valor={String(periodo)} onChange={(id) => setPeriodo(Number(id))} />
          </div>
        )}
      </header>

      {consulta.isError && !dados ? (
        <EstadoErro erro={consulta.error} onTentar={() => void consulta.refetch()} titulo="Não foi possível carregar o painel" />
      ) : !dados ? (
        <Carregando />
      ) : !comPacientes ? (
        <Card>
          <EmptyState
            icone={<UserPlus />}
            titulo="Nenhum paciente vinculado ainda"
            descricao="Gere um código de vínculo e passe ao paciente. Quando ele informar o código no app, os registros que ele compartilhar aparecem aqui."
            acao={<Button onPress={() => navigate('/vinculo')}>Gerar código de vínculo</Button>}
          />
        </Card>
      ) : (
        <div className={pagina.grade} aria-busy={consulta.isPlaceholderData}>
          <div className={cx(pagina.grade, pagina.largura)}>
            <Engajamento engajamento={dados.engajamento} />
            <Alertas alertas={dados.alertas} />
          </div>
          <Insights insights={dados.insightsSemana} />
          <div className={css.coluna}>
            <Vinculados dados={dados} periodo={periodo} />
            <Atividades itens={dados.atividadeRecente} />
            <DadosInsuficientes itens={dados.dadosInsuficientes} />
            <Escalas escalas={dados.escalas} naoVistas={dados.alertas.escalasNaoVistas} />
          </div>
          <div className={css.coluna}>
            <ResumoCheckins itens={dados.checkinsRecentes} />
            <Medias medias={dados.medias} periodo={periodo} />
            <ConsultasHoje itens={dados.consultasHoje} />
          </div>
        </div>
      )}
      <Disclaimer />
    </section>
  );
}
