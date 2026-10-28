import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { Button as BotaoAria } from 'react-aria-components';
import type { CalendarDate } from '@internationalized/date';
import { StatusConsulta } from '../../components/ui/StatusConsulta';
import { cx } from '../../lib/cx';
import { formatarHora } from '../../lib/formatar';
import type { Consulta } from '../../lib/psicologoApi';
import { STATUS_CONSULTA } from '../../lib/rotulos';
import { abreviacaoDoDia, diaDoInstante, diaPorExtenso, hoje, minutosDoDia } from './agenda';
import css from './Calendario.module.css';

// A grade cobre 07h às 21h e se estende quando há consulta fora dessa faixa.
const HORA_INICIAL = 7;
const HORA_FINAL = 21;
const MINUTOS_POR_HORA = 60;
const MINUTOS_POR_DIA = 24 * MINUTOS_POR_HORA;

type Trecho = { consulta: Consulta; inicio: number; fim: number };
type Posicionada = Trecho & { faixa: number; faixas: number };

// Consultas que se sobrepõem (uma cancelada e a nova, por exemplo) dividem a largura da coluna em faixas.
function posicionar(doDia: Trecho[]): Posicionada[] {
  const fimDaFaixa: number[] = [];
  const itens = [...doDia]
    .sort((a, b) => a.inicio - b.inicio)
    .map((trecho) => {
      const livre = fimDaFaixa.findIndex((ocupadaAte) => ocupadaAte <= trecho.inicio);
      const faixa = livre < 0 ? fimDaFaixa.length : livre;
      fimDaFaixa[faixa] = trecho.fim;
      return { ...trecho, faixa };
    });
  return itens.map((item) => ({ ...item, faixas: fimDaFaixa.length }));
}

type Props = { dias: CalendarDate[]; consultas: Consulta[]; onAbrir: (consulta: Consulta) => void; onDia: (dia: CalendarDate) => void };

export function GradeHoras({ dias, consultas, onAbrir, onDia }: Props) {
  // A consulta que vira a meia-noite (no máximo 4 h) aparece nos dois dias, cada um com a sua parte.
  const porDia = new Map(dias.map((d) => [d.toString(), [] as Trecho[]]));
  for (const consulta of consultas) {
    const dia = diaDoInstante(consulta.inicio);
    const inicio = minutosDoDia(consulta.inicio);
    const fim = inicio + (Date.parse(consulta.fim) - Date.parse(consulta.inicio)) / 60_000;
    porDia.get(dia.toString())?.push({ consulta, inicio, fim: Math.min(fim, MINUTOS_POR_DIA) });
    if (fim > MINUTOS_POR_DIA) porDia.get(dia.add({ days: 1 }).toString())?.push({ consulta, inicio: 0, fim: fim - MINUTOS_POR_DIA });
  }
  const posicionadas = new Map([...porDia].map(([dia, doDia]) => [dia, posicionar(doDia)]));
  const todas = [...posicionadas.values()].flat();

  const horaInicial = Math.min(HORA_INICIAL, ...todas.map((p) => Math.floor(p.inicio / MINUTOS_POR_HORA)));
  const horaFinal = Math.max(HORA_FINAL, ...todas.map((p) => Math.ceil(p.fim / MINUTOS_POR_HORA)));
  const horas = Array.from({ length: horaFinal - horaInicial }, (_, i) => horaInicial + i);
  const hojeIso = hoje().toString();

  // Ao trocar de período, a grade rola até uma hora antes da primeira consulta em vez de começar sempre às 07h.
  const rolagem = useRef<HTMLDivElement>(null);
  const primeira = Math.min(...todas.map((p) => p.inicio));
  useLayoutEffect(() => {
    const el = rolagem.current;
    if (!el) return;
    const proporcao = Number.isFinite(primeira) ? Math.max(0, primeira - horaInicial * MINUTOS_POR_HORA - MINUTOS_POR_HORA) / (horas.length * MINUTOS_POR_HORA) : 0;
    el.scrollTop = proporcao * el.scrollHeight;
    // Em telas estreitas a semana rola na horizontal: começa no dia de hoje, se ele estiver nela.
    const coluna = el.querySelector('[aria-current="date"]');
    const canto = el.querySelector(`.${css.canto}`);
    el.scrollLeft = coluna && canto ? coluna.getBoundingClientRect().left - el.getBoundingClientRect().left + el.scrollLeft - canto.getBoundingClientRect().width : 0;
  }, [primeira, dias[0]?.toString()]);

  return (
    <div ref={rolagem} className={css.rolagem} role="region" tabIndex={0} aria-label="Agenda com grade de horas">
      <div className={css.grade} data-dias={dias.length} style={{ '--horas': horas.length } as CSSProperties}>
        <div className={css.canto} />
        {dias.map((dia) => {
          const rotulo = (
            <>
              <span className={css.semana}>{abreviacaoDoDia(dia)}</span>
              <span className={css.numeroDia}>{dia.day}</span>
            </>
          );
          return (
            <div key={dia.toString()} className={css.cabecalhoDia} aria-current={dia.toString() === hojeIso ? 'date' : undefined}>
              {dias.length > 1 ? (
                <BotaoAria className={css.diaBotao} aria-label={`Abrir ${diaPorExtenso(dia)}`} onPress={() => onDia(dia)}>
                  {rotulo}
                </BotaoAria>
              ) : (
                rotulo
              )}
            </div>
          );
        })}

        <div className={css.horas}>
          {horas.map((hora) => (
            <span key={hora} className={css.hora}>
              {String(hora).padStart(2, '0')}h
            </span>
          ))}
        </div>
        {dias.map((dia) => (
          <div key={dia.toString()} role="group" aria-label={diaPorExtenso(dia)} className={css.dia}>
            {posicionadas.get(dia.toString())?.map(({ consulta, inicio, fim, faixa, faixas }) => (
              <BotaoAria
                key={consulta.id}
                className={cx(css.bloco, css[consulta.status])}
                style={
                  {
                    '--inicio': inicio - horaInicial * MINUTOS_POR_HORA,
                    '--duracao': fim - inicio,
                    '--faixa': faixa,
                    '--faixas': faixas,
                  } as CSSProperties
                }
                aria-label={`${formatarHora(consulta.inicio)} às ${formatarHora(consulta.fim)}, ${consulta.pacienteNome}, ${STATUS_CONSULTA[consulta.status]}`}
                onPress={() => onAbrir(consulta)}
              >
                <span className={css.horario}>
                  {formatarHora(consulta.inicio)} às {formatarHora(consulta.fim)}
                </span>
                <span className={css.paciente}>{consulta.pacienteNome}</span>
                <StatusConsulta status={consulta.status} />
              </BotaoAria>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
