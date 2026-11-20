import type { CSSProperties, ReactNode } from 'react';
import { parseDate } from '@internationalized/date';
import { Info } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { ChipFiltro } from '../../components/ui/Chip';
import { ConsentimentoAusente } from '../../components/ui/ConsentimentoAusente';
import { DateRangePicker, type Periodo } from '../../components/ui/DateRangePicker';
import { Disclaimer } from '../../components/ui/Disclaimer';
import { formatarDataCurta, formatarDia, formatarNumero, formatarVariacao, plural } from '../../lib/formatar';
import { diasDoPeriodo, MAX_DIAS_PERIODO, periodoAnterior } from '../../lib/periodo';
import type { ResumoPaciente, ResumoPeriodo } from '../../lib/psicologoApi';
import { corDaEmocao, FAIXAS_HORARIO, HABITOS, rotuloEmocao } from '../../lib/rotulos';
import pagina from '../Pagina.module.css';
import { GraficoBarrasHorizontais, GraficoColunas, GraficoHumorAnsiedade, LegendaSeries } from './Graficos';
import css from './VisaoGeral.module.css';

type Props = {
  resumo: ResumoPaciente;
  // Período a que `resumo` pertence (pode estar um passo atrás do escolhido enquanto recarrega).
  de: string;
  ate: string;
  comparar: Periodo | null;
  onComparar: (periodo: Periodo | null) => void;
};

function Bloco({ titulo, apoio, consentido = true, largo, children }: { titulo: string; apoio?: string; consentido?: boolean; largo?: boolean; children: ReactNode }) {
  return (
    <Card className={largo ? pagina.largura : undefined}>
      <div className={pagina.secao}>
        <div>
          <h2 className={css.tituloBloco}>{titulo}</h2>
          {apoio && <p className={pagina.subtituloSecao}>{apoio}</p>}
        </div>
        {consentido ? children : <ConsentimentoAusente />}
      </div>
    </Card>
  );
}

function diasEntre(de: string, ate: string) {
  const dias: string[] = [];
  for (let dia = parseDate(de); dia.compare(parseDate(ate)) <= 0; dia = dia.add({ days: 1 })) dias.push(dia.toString());
  return dias;
}

const media = (valor: number | null, unidade = '') => (valor === null ? 'Sem dado' : `${formatarNumero(valor)}${unidade}`);
const trecho = (p: Periodo) => `${formatarDia(p.start.toString())} a ${formatarDia(p.end.toString())}`;

function Habitos({ habitos }: { habitos: NonNullable<ResumoPaciente['habitos']> }) {
  if (habitos.diasRegistrados === 0) return <p className={pagina.apoio}>Nenhum hábito registrado neste período.</p>;
  return (
    <ul className={css.habitos}>
      {HABITOS.map(({ chave, rotulo }) => (
        <li key={chave}>
          <p className={css.habito}>
            <span>{rotulo}</span>
            <span>
              {habitos[chave]} de {plural(habitos.diasRegistrados, 'dia registrado', 'dias registrados')}
            </span>
          </p>
          {/* Largura da barra = dias com o hábito sobre dias registrados: única medida dinâmica, por custom property. */}
          <span aria-hidden className={css.trilho}>
            <span className={css.preenchido} style={{ '--proporcao': habitos[chave] / habitos.diasRegistrados } as CSSProperties} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function Comparacao({ resumo, periodo, comparar, onComparar }: Pick<Props, 'resumo' | 'comparar' | 'onComparar'> & { periodo: Periodo }) {
  const { consentimentos: c, comparacao } = resumo;
  const linhas: Array<{ rotulo: string; ler: (p: ResumoPeriodo) => number | null; unidade?: string; mostrar: boolean }> = [
    { rotulo: 'Registros', ler: (p) => p.registros, mostrar: c.humor },
    { rotulo: 'Humor médio, de 1 a 10', ler: (p) => p.humorMedio, mostrar: c.humor },
    { rotulo: 'Ansiedade média, de 1 a 10', ler: (p) => p.ansiedadeMedia, mostrar: c.humor },
    { rotulo: 'Sono médio', ler: (p) => p.sonoMedioHoras, unidade: ' h', mostrar: c.habitos },
  ];
  const excede = comparar !== null && diasDoPeriodo(comparar) > MAX_DIAS_PERIODO;

  return (
    <Bloco
      titulo="Comparação entre períodos"
      apoio="Médias de dois períodos lado a lado. A variação é só a diferença entre os números, sem juízo."
      consentido={c.humor || c.habitos}
      largo
    >
      <div className={css.controleComparacao}>
        <ChipFiltro isSelected={comparar !== null} onChange={(marcado) => onComparar(marcado ? periodoAnterior(periodo) : null)}>
          Comparar com outro período
        </ChipFiltro>
        {comparar && <DateRangePicker rotulo="Período de comparação" semAtalhos valor={comparar} onChange={onComparar} />}
      </div>
      {excede && <p role="alert" className={css.erro}>Escolha um período de comparação de até {MAX_DIAS_PERIODO} dias.</p>}
      {comparar && comparacao && (
        <div className={css.rolagem}>
          <table className={css.tabela}>
            <caption className={css.legendaTabela}>Médias por período</caption>
            <thead>
              <tr>
                <th scope="col">Medida</th>
                <th scope="col">Período atual</th>
                <th scope="col">Comparação</th>
                <th scope="col">Variação</th>
              </tr>
              <tr className={css.periodos}>
                <td />
                <td>{trecho(periodo)}</td>
                <td>{trecho(comparar)}</td>
                <td />
              </tr>
            </thead>
            <tbody>
              {linhas
                .filter((linha) => linha.mostrar)
                .map(({ rotulo, ler, unidade }) => {
                  const atual = ler(comparacao.atual);
                  const anterior = ler(comparacao.anterior);
                  return (
                    <tr key={rotulo}>
                      <th scope="row">{rotulo}</th>
                      <td>{media(atual, unidade)}</td>
                      <td>{media(anterior, unidade)}</td>
                      <td>{atual !== null && anterior !== null ? `${formatarVariacao(atual - anterior)}${unidade ?? ''}` : 'Sem dado'}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </Bloco>
  );
}

export default function VisaoGeral({ resumo, de, ate, comparar, onComparar }: Props) {
  const { consentimentos: c } = resumo;
  const periodo: Periodo = { start: parseDate(de), end: parseDate(ate) };
  const porDia = new Map(resumo.registros.map((r) => [r.data, r]));
  const mediaPorDia = new Map((resumo.mediaMovelHumor ?? []).map((m) => [m.data, m.valor]));
  const dias = diasEntre(de, ate).map((data) => {
    const r = porDia.get(data);
    return {
      data,
      humor: r?.humor ?? null,
      ansiedade: r?.ansiedade ?? null,
      sono: r?.sonoHoras ?? null,
      mediaMovel: mediaPorDia.get(data) ?? null,
    };
  });
  const horarios = resumo.distribuicaoHorario;
  const crises = resumo.crisesPorHorario;
  const correlacao = resumo.correlacaoSonoHumor;

  return (
    <div className={css.visao}>
      {resumo.esparso && (
        <p className={css.aviso}>
          <Info aria-hidden />
          Este paciente fez menos de 3 registros nos últimos 7 dias. Os gráficos e as médias abaixo descrevem poucos dias.
        </p>
      )}

      <div className={pagina.grade}>
        <Bloco
          titulo="Humor e ansiedade por dia"
          apoio="Intensidade informada pelo paciente, de 1 a 10. Dias sem registro ficam em branco."
          consentido={c.humor}
          largo
        >
          <LegendaSeries comMedia={resumo.mediaMovelHumor !== null} />
          <GraficoHumorAnsiedade dados={dias} />
        </Bloco>

        <Bloco
          titulo="Ansiedade em relação à média"
          apoio={
            resumo.variacaoAnsiedade?.media != null
              ? `Quanto cada registro ficou acima (positivo) ou abaixo (negativo) da média do período, ${formatarNumero(resumo.variacaoAnsiedade.media)} de 10.`
              : 'Quanto cada registro ficou acima ou abaixo da média de ansiedade do período.'
          }
          consentido={c.humor}
        >
          {resumo.variacaoAnsiedade && resumo.variacaoAnsiedade.dias.length > 0 ? (
            <GraficoColunas
              nome="Diferença da média"
              dados={resumo.variacaoAnsiedade.dias.map((d) => ({ rotulo: formatarDataCurta(d.data), valor: d.desvio }))}
            />
          ) : (
            <p className={pagina.apoio}>Nenhum registro de ansiedade neste período.</p>
          )}
        </Bloco>

        <Bloco titulo="Sono por dia" apoio="Horas de sono informadas pelo paciente." consentido={c.habitos}>
          <GraficoColunas
            nome="Sono"
            unidade=" h"
            dados={dias.map((d) => ({ rotulo: formatarDataCurta(d.data), valor: d.sono }))}
          />
        </Bloco>

        <Bloco
          titulo="Registros por horário"
          apoio={FAIXAS_HORARIO.map((f) => `${f.rotulo}, ${f.faixa}`).join('. ') + '.'}
          consentido={c.humor}
        >
          {horarios && (
            <GraficoColunas
              nome="Registros"
              poucas
              dados={FAIXAS_HORARIO.map((f) => ({ rotulo: f.rotulo, valor: horarios[f.id] }))}
            />
          )}
        </Bloco>

        <Bloco titulo="Emoções mais frequentes" apoio="Quantas vezes cada emoção apareceu nos registros do período." consentido={c.humor}>
          {resumo.frequenciaEmocional.length === 0 ? (
            <p className={pagina.apoio}>Nenhuma emoção registrada neste período.</p>
          ) : (
            <GraficoBarrasHorizontais
              dados={resumo.frequenciaEmocional.map((f) => ({ rotulo: rotuloEmocao(f.emocao), quantidade: f.quantidade, cor: corDaEmocao(f.emocao) }))}
            />
          )}
        </Bloco>

        <Bloco
          titulo="Crises por horário"
          apoio={
            'Acessos ao SOS e check-ins com ansiedade de 7 a 10, pela faixa do dia em que aconteceram.' +
            (crises.sos === null ? ' O paciente não compartilha o uso do SOS: só a ansiedade entra.' : '')
          }
          consentido={crises.sos !== null || crises.ansiedadeAlta !== null}
        >
          <GraficoColunas
            nome="Crises"
            poucas
            dados={FAIXAS_HORARIO.map((f) => ({
              rotulo: f.rotulo,
              valor: (crises.sos?.[f.id] ?? 0) + (crises.ansiedadeAlta?.[f.id] ?? 0),
            }))}
          />
        </Bloco>

        <Bloco titulo="Uso do SOS" apoio="Dia e hora em que o paciente abriu o SOS. O que ele fez lá não é registrado." consentido={resumo.sos !== null}>
          {resumo.sos?.length ? (
            <ul className={css.diario}>
              {resumo.sos.map((u, i) => (
                <li key={`${u.data}-${u.hora}-${i}`}>
                  <time dateTime={u.data}>{formatarDia(u.data)}</time>, {u.hora}
                </li>
              ))}
            </ul>
          ) : (
            <p className={pagina.apoio}>Nenhum acesso ao SOS neste período.</p>
          )}
        </Bloco>

        <Bloco titulo="Hábitos" apoio="Dias com o hábito marcado sobre os dias com hábitos registrados." consentido={c.habitos}>
          {resumo.habitos && <Habitos habitos={resumo.habitos} />}
        </Bloco>

        <Bloco titulo="Sono e humor" apoio="Relação entre horas de sono e humor nos dias com os dois registros." consentido={c.humor && c.habitos}>
          {correlacao ? (
            <div className={css.correlacao}>
              <p className={css.r}>
                r = {correlacao.r.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className={css.n}>n = {plural(correlacao.n, 'dia', 'dias')} com sono e humor registrados</p>
              <p className={css.nota}>Correlação não indica causa.</p>
            </div>
          ) : (
            <p className={pagina.apoio}>Poucos dias com sono e humor registrados. O cálculo pede 10 dias ou mais.</p>
          )}
        </Bloco>

        <Comparacao resumo={resumo} periodo={periodo} comparar={comparar} onComparar={onComparar} />

        <Bloco
          titulo="Diário compartilhado"
          apoio="O paciente escolhe, a cada check-in ou entrada do diário, se o texto é compartilhado."
          largo
        >
          {resumo.diario.length === 0 ? (
            <p className={pagina.apoio}>Nenhum texto compartilhado neste período.</p>
          ) : (
            <ul className={css.diario}>
              {resumo.diario.map((entrada, i) => (
                <li key={`${entrada.data}-${entrada.hora ?? ''}-${i}`}>
                  <figure className={css.entrada}>
                    <figcaption>
                      {entrada.origem === 'avulso' ? 'Diário' : 'Check-in'} de{' '}
                      <time dateTime={entrada.data}>{formatarDia(entrada.data)}</time>
                      {entrada.hora && `, ${entrada.hora}`}
                    </figcaption>
                    <blockquote>{entrada.texto}</blockquote>
                  </figure>
                </li>
              ))}
            </ul>
          )}
        </Bloco>

        {c.humor && (
          <Card className={pagina.largura}>
            <details className={css.detalhes}>
              <summary>Ver os registros em tabela</summary>
              <div className={css.rolagem}>
                <table className={css.tabela}>
                  <caption className={css.legendaTabela}>Registros do período</caption>
                  <thead>
                    <tr>
                      <th scope="col">Data</th>
                      <th scope="col">Horário</th>
                      <th scope="col">Humor</th>
                      <th scope="col">Ansiedade</th>
                      {c.habitos && <th scope="col">Sono (h)</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {resumo.registros.map((r) => (
                      <tr key={r.id}>
                        <th scope="row">{formatarDia(r.data)}</th>
                        <td>{r.horario ?? 'Sem dado'}</td>
                        <td>{r.humor ?? 'Sem dado'}</td>
                        <td>{r.ansiedade ?? 'Sem dado'}</td>
                        {c.habitos && <td>{r.sonoHoras === null ? 'Sem dado' : formatarNumero(r.sonoHoras)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </Card>
        )}
      </div>

      <Disclaimer />
    </div>
  );
}
