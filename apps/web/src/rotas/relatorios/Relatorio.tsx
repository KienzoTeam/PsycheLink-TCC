import type { CSSProperties, ReactNode } from 'react';
import { parseDate } from '@internationalized/date';
import { Chip } from '../../components/ui/Chip';
import { ConsentimentoAusente } from '../../components/ui/ConsentimentoAusente';
import { Disclaimer } from '../../components/ui/Disclaimer';
import { GraficoLinhas } from '../../components/ui/GraficoLinhas';
import { MarcadorItem9 } from '../../components/ui/MarcadorItem9';
import { StatusConsulta } from '../../components/ui/StatusConsulta';
import { cx } from '../../lib/cx';
import {
  diaDe,
  formatarDataCurta,
  formatarDataHora,
  formatarDia,
  formatarHora,
  formatarNumero,
  media,
  plural,
} from '../../lib/formatar';
import type { RelatorioBuscado, RelatorioGeral, RelatorioPaciente } from '../../lib/psicologoApi';
import { AVISO_ESCALA, emocaoDe, FAIXAS_HORARIO, rotuloEmocao, STATUS_APLICACAO } from '../../lib/rotulos';
import { Evolucao, porEscala } from '../escalas/Evolucao';
import css from './Relatorio.module.css';

type Props = RelatorioBuscado & {
  // Só existe depois da exportação, que registra o relatório na auditoria.
  numero?: number;
  // Folha A4 da rota de impressão, em vez do cartão da prévia.
  impressao?: boolean;
};

const SEM_DADO = 'Sem dado';
const NAO_COMPARTILHA = '—';

// Categoria não compartilhada vira travessão; compartilhada e sem número vira "Sem dado".
const celula = (consentiu: boolean, numero: number | null, unidade = '') =>
  !consentiu ? NAO_COMPARTILHA : numero === null ? SEM_DADO : `${formatarNumero(numero)}${unidade}`;

function Secao({ titulo, apoio, consentido = true, novaPagina, children }: { titulo: string; apoio?: string; consentido?: boolean; novaPagina?: boolean; children: ReactNode }) {
  return (
    <section className={cx(css.secao, novaPagina && css.novaPagina)}>
      <h3 className={css.tituloSecao}>{titulo}</h3>
      {apoio && <p className={css.apoio}>{apoio}</p>}
      {consentido ? children : <ConsentimentoAusente />}
    </section>
  );
}

// Tabela larga rola dentro do próprio contêiner; a região focável deixa o teclado alcançar o que está fora da tela.
function Rolavel({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className={css.rolagem} role="region" tabIndex={0} aria-label={rotulo}>
      {children}
    </div>
  );
}

type ItemBarra = { chave: string; rotulo: ReactNode; valor: number; texto: string };

// Barras com o valor escrito ao lado: a leitura não depende da cor, e em preto e branco o número está lá.
function Barras({ itens, maximo }: { itens: ItemBarra[]; maximo: number }) {
  return (
    <ul className={css.barras}>
      {itens.map(({ chave, rotulo, valor, texto }) => (
        <li key={chave} className={css.barra}>
          <span className={css.rotuloBarra}>{rotulo}</span>
          <span aria-hidden className={css.trilho}>
            {/* Largura = valor sobre o máximo: única medida dinâmica, por custom property. */}
            <span className={css.preenchido} style={{ '--proporcao': maximo > 0 ? valor / maximo : 0 } as CSSProperties} />
          </span>
          <span className={css.valorBarra}>{texto}</span>
        </li>
      ))}
    </ul>
  );
}

function diasEntre(de: string, ate: string) {
  const dias: string[] = [];
  for (let dia = parseDate(de); dia.compare(parseDate(ate)) <= 0; dia = dia.add({ days: 1 })) dias.push(dia.toString());
  return dias;
}

function Geral({ dados }: { dados: RelatorioGeral }) {
  const { pacientes } = dados;
  const comAusencia = pacientes.some(({ consentimentos: c }) => !c.humor || !c.habitos || !c.escalas);

  return (
    <Secao titulo="Pacientes vinculados" apoio={`${plural(pacientes.length, 'paciente vinculado', 'pacientes vinculados')} no período.`}>
      {pacientes.length === 0 ? (
        <p className={css.apoio}>Nenhum paciente vinculado.</p>
      ) : (
        <Rolavel rotulo="Resumo por paciente">
          <table className={css.tabela}>
            <caption className={css.legendaTabela}>Resumo por paciente</caption>
            <thead>
              <tr>
                <th scope="col" rowSpan={2}>
                  Paciente
                </th>
                <th scope="col" rowSpan={2}>
                  Registros
                </th>
                <th scope="col" rowSpan={2}>
                  Humor médio
                </th>
                <th scope="col" rowSpan={2}>
                  Ansiedade média
                </th>
                <th scope="col" rowSpan={2}>
                  Sono médio
                </th>
                <th scope="col" rowSpan={2}>
                  Escalas concluídas
                </th>
                <th scope="colgroup" colSpan={4}>
                  Consultas
                </th>
              </tr>
              <tr>
                <th scope="col">Agendadas</th>
                <th scope="col">Concluídas</th>
                <th scope="col">Canceladas</th>
                <th scope="col">Remarcadas</th>
              </tr>
            </thead>
            <tbody>
              {pacientes.map((p) => (
                <tr key={p.pacienteId}>
                  <th scope="row">{p.nome}</th>
                  <td>{p.consentimentos.humor ? p.registros : NAO_COMPARTILHA}</td>
                  <td>{celula(p.consentimentos.humor, p.humorMedio)}</td>
                  <td>{celula(p.consentimentos.humor, p.ansiedadeMedia)}</td>
                  <td>{celula(p.consentimentos.habitos, p.sonoMedioHoras, ' h')}</td>
                  <td>{p.consentimentos.escalas ? p.escalasConcluidas : NAO_COMPARTILHA}</td>
                  <td>{p.consultas.agendada}</td>
                  <td>{p.consultas.concluida}</td>
                  <td>{p.consultas.cancelada}</td>
                  <td>{p.consultas.remarcada}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Rolavel>
      )}
      <p className={css.nota}>
        Humor e ansiedade, de 1 a 10. Escalas: contagem de aplicações concluídas.
        {comAusencia && ` ${NAO_COMPARTILHA} indica uma categoria que o paciente não compartilha; não é ausência de registros.`}
      </p>
    </Secao>
  );
}

function Individual({ dados }: { dados: RelatorioPaciente }) {
  const { consentimentos: c, serieDiaria: serie, cabecalho } = dados;
  const { de, ate } = cabecalho.periodo;
  const dias = diasEntre(de, ate);
  const porData = new Map(serie.map((r) => [r.data, r]));
  const horarios = dados.distribuicaoHorario;
  const habitos = dados.habitos;
  const resumo = [
    { rotulo: 'Registros', texto: celula(c.humor, serie.length) },
    { rotulo: 'Humor médio, de 1 a 10', texto: celula(c.humor, media(serie.map((r) => r.humor))) },
    { rotulo: 'Ansiedade média, de 1 a 10', texto: celula(c.humor, media(serie.map((r) => r.ansiedade))) },
    { rotulo: 'Sono médio', texto: celula(c.habitos, media(serie.map((r) => r.sonoHoras)), ' h') },
  ];
  const evolucoes = porEscala(dados.escalas).filter((grupo) => grupo.length > 1);

  return (
    <>
      <Secao titulo="Resumo do período">
        <dl className={css.resumo}>
          {resumo.map(({ rotulo, texto }) => (
            <div key={rotulo}>
              <dt>{rotulo}</dt>
              <dd>{texto}</dd>
            </div>
          ))}
        </dl>
        {resumo.some((r) => r.texto === NAO_COMPARTILHA) && (
          <p className={css.nota}>{NAO_COMPARTILHA} indica uma categoria que o paciente não compartilha.</p>
        )}
      </Secao>

      <Secao titulo="Humor e ansiedade por dia" apoio="Intensidade informada pelo paciente, de 1 a 10. Dias sem registro ficam em branco." consentido={c.humor}>
        <GraficoLinhas
          aria-label={`Humor e ansiedade por dia, de 1 a 10, de ${formatarDia(de)} a ${formatarDia(ate)}. ${serie.length} registros; os valores estão na tabela da série diária.`}
          rotulos={dias.map(formatarDataCurta)}
          series={[
            { nome: 'Humor', valores: dias.map((d) => porData.get(d)?.humor ?? null) },
            { nome: 'Ansiedade', valores: dias.map((d) => porData.get(d)?.ansiedade ?? null), tracejada: true, quadrada: true },
          ]}
          dominio={[1, 10]}
          marcas={[2, 4, 6, 8, 10]}
        />
      </Secao>

      <Secao titulo="Emoções mais frequentes" apoio="Quantas vezes cada emoção apareceu nos registros do período." consentido={c.humor}>
        {dados.frequenciaEmocional.length === 0 ? (
          <p className={css.apoio}>Nenhuma emoção registrada neste período.</p>
        ) : (
          <Barras
            maximo={Math.max(...dados.frequenciaEmocional.map((f) => f.quantidade))}
            itens={dados.frequenciaEmocional.map((f) => ({
              chave: f.emocao,
              rotulo: <Chip emocao={emocaoDe(f.emocao)}>{rotuloEmocao(f.emocao)}</Chip>,
              valor: f.quantidade,
              texto: String(f.quantidade),
            }))}
          />
        )}
      </Secao>

      <Secao titulo="Registros por horário" apoio="Em que parte do dia o paciente registrou." consentido={c.humor}>
        {horarios && (
          <Barras
            maximo={Math.max(...Object.values(horarios))}
            itens={FAIXAS_HORARIO.map((f) => ({ chave: f.id, rotulo: `${f.rotulo}, ${f.faixa}`, valor: horarios[f.id], texto: String(horarios[f.id]) }))}
          />
        )}
      </Secao>

      <Secao titulo="Hábitos" apoio="Dias com o hábito marcado sobre os dias com hábitos registrados." consentido={c.habitos}>
        {habitos && habitos.diasRegistrados > 0 ? (
          <Barras
            maximo={habitos.diasRegistrados}
            itens={[
              { chave: 'exercicio', rotulo: 'Exercício', valor: habitos.exercicio },
              { chave: 'meditacao', rotulo: 'Meditação', valor: habitos.meditacao },
              { chave: 'medicacao', rotulo: 'Medicação', valor: habitos.medicacao },
            ].map((h) => ({ ...h, texto: `${h.valor} de ${plural(habitos.diasRegistrados, 'dia', 'dias')}` }))}
          />
        ) : (
          <p className={css.apoio}>Nenhum hábito registrado neste período.</p>
        )}
      </Secao>

      <Secao titulo="Escalas" apoio={AVISO_ESCALA} consentido={c.escalas}>
        {dados.escalas.length === 0 ? (
          <p className={css.apoio}>Nenhuma escala neste período.</p>
        ) : (
          <>
            <Rolavel rotulo="Escalas do período">
              <table className={css.tabela}>
                <caption className={css.legendaTabela}>Escalas do período</caption>
                <thead>
                  <tr>
                    <th scope="col">Escala</th>
                    <th scope="col">Situação</th>
                    <th scope="col">Data</th>
                    <th scope="col">Escore bruto</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.escalas.map((a) => (
                    <tr key={a.id}>
                      <th scope="row">{a.escala.sigla}</th>
                      <td>{STATUS_APLICACAO[a.status]}</td>
                      <td>{formatarDia(diaDe(a.respondidoEm ?? a.solicitadoEm))}</td>
                      <td>
                        {a.scoreTotal === null ? SEM_DADO : `${a.scoreTotal} de ${a.escala.pontuacaoMaxima}`}
                        {a.item9DiferenteDeZero && <MarcadorItem9 />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Rolavel>
            {evolucoes.map((grupo) => (
              <Evolucao key={grupo[0]!.escala.sigla} grupo={grupo} />
            ))}
          </>
        )}
      </Secao>

      <Secao titulo="Consultas" apoio="Agenda do período, sem as observações.">
        {dados.consultas.length === 0 ? (
          <p className={css.apoio}>Nenhuma consulta neste período.</p>
        ) : (
          <Rolavel rotulo="Consultas do período">
            <table className={css.tabela}>
              <caption className={css.legendaTabela}>Consultas do período</caption>
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">Horário</th>
                  <th scope="col">Situação</th>
                </tr>
              </thead>
              <tbody>
                {dados.consultas.map((q) => (
                  <tr key={q.id}>
                    <th scope="row">{formatarDia(diaDe(q.inicio))}</th>
                    <td>
                      {formatarHora(q.inicio)} às {formatarHora(q.fim)}
                    </td>
                    <td>
                      <StatusConsulta status={q.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Rolavel>
        )}
      </Secao>

      <Secao titulo="Série diária" apoio="Os registros do período, um por linha." consentido={c.humor} novaPagina>
        {serie.length === 0 ? (
          <p className={css.apoio}>Nenhum registro neste período.</p>
        ) : (
          <Rolavel rotulo="Registros do período">
            <table className={css.tabela}>
              <caption className={css.legendaTabela}>Registros do período</caption>
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">Horário</th>
                  <th scope="col">Humor</th>
                  <th scope="col">Ansiedade</th>
                  <th scope="col">Sono</th>
                </tr>
              </thead>
              <tbody>
                {serie.map((r) => (
                  <tr key={r.id}>
                    <th scope="row">{formatarDia(r.data)}</th>
                    <td>{r.horario ?? SEM_DADO}</td>
                    <td>{r.humor ?? SEM_DADO}</td>
                    <td>{r.ansiedade ?? SEM_DADO}</td>
                    <td>{celula(c.habitos, r.sonoHoras, ' h')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Rolavel>
        )}
      </Secao>

      {dados.anotacoes && (
        <Secao titulo="Anotações privadas" apoio="Incluídas por escolha do psicólogo. Este documento deve ser guardado com o mesmo sigilo das anotações." novaPagina>
          {dados.anotacoes.length === 0 ? (
            <p className={css.apoio}>Nenhuma anotação neste período.</p>
          ) : (
            <ul className={css.anotacoes}>
              {dados.anotacoes.map((a) => (
                <li key={a.id}>
                  <p className={css.dataAnotacao}>{formatarDataHora(a.criadoEm)}</p>
                  <p className={css.textoAnotacao}>{a.conteudo}</p>
                </li>
              ))}
            </ul>
          )}
        </Secao>
      )}
    </>
  );
}

// Tabela de layout (role="presentation"): é o que faz o navegador repetir o cabeçalho corrido e o rodapé em toda página impressa.
const camada = { role: 'presentation' } as const;

export function Relatorio(props: Props) {
  const { cabecalho } = props.dados;
  const periodo = `${formatarDia(cabecalho.periodo.de)} a ${formatarDia(cabecalho.periodo.ate)}`;
  const nome = props.tipo === 'paciente' ? props.dados.cabecalho.paciente.nome : null;

  return (
    <article className={cx(css.folha, props.impressao && css.impressao)} aria-labelledby="titulo-relatorio">
      <table {...camada} className={css.estrutura}>
        <thead {...camada} className={css.corrido}>
          <tr {...camada}>
            <td {...camada}>
              <p className={css.linhaCorrida}>
                PsycheLink · Relatório {props.numero === undefined ? '' : `nº ${props.numero} · `}
                {nome && `${nome} · `}
                {periodo}
              </p>
            </td>
          </tr>
        </thead>
        <tbody {...camada}>
          <tr {...camada}>
            <td {...camada}>
              <header className={css.cabecalho}>
                <p className={css.marca}>PsycheLink · {props.tipo === 'geral' ? 'Relatório geral' : 'Relatório do paciente'}</p>
                <h2 id="titulo-relatorio" className={css.titulo}>
                  {props.numero === undefined ? 'Prévia do relatório' : `Relatório nº ${props.numero}`}
                </h2>
                <dl className={css.meta}>
                  {nome && (
                    <div>
                      <dt>Paciente</dt>
                      <dd>{nome}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Período</dt>
                    <dd>{periodo}</dd>
                  </div>
                  <div>
                    <dt>Psicólogo</dt>
                    <dd>
                      {cabecalho.psicologo.nome}, CRP {cabecalho.psicologo.crp}
                    </dd>
                  </div>
                  <div>
                    <dt>Gerado em</dt>
                    <dd>{formatarDataHora(cabecalho.geradoEm)}</dd>
                  </div>
                </dl>
              </header>
              <div className={css.corpo}>{props.tipo === 'geral' ? <Geral dados={props.dados} /> : <Individual dados={props.dados} />}</div>
            </td>
          </tr>
        </tbody>
        <tfoot {...camada}>
          <tr {...camada}>
            <td {...camada}>
              <footer className={css.rodape}>
                <Disclaimer />
                <p className={css.confidencial}>Documento confidencial.</p>
              </footer>
            </td>
          </tr>
        </tfoot>
      </table>
    </article>
  );
}
