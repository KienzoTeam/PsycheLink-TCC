import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import { formatarDataCurta, formatarNumero } from '../../lib/formatar';
import css from './Graficos.module.css';

// Geometria interna do SVG: o CSS alcança traço, cor e fonte, mas não margens, raios nem larguras de eixo.
const MARGEM = { top: 8, right: 8, bottom: 0, left: 0 };
const MARGEM_COM_VALORES = { ...MARGEM, top: 24 };
const LARGURA_EIXO_Y = 32;
const LARGURA_ROTULO_Y = 72;
const RAIO_PONTO = 4;
const RAIO_BARRA = 4;
const LARGURA_MAX_BARRA = 24;
const MAX_DIAS_COM_PONTO = 31;
const ESCALA_INTENSIDADE = [2, 4, 6, 8, 10];

// Humor sobe na rampa de um tom, ansiedade fica no passo claro dela e tracejada: a série nunca depende só da cor.
const COR_HUMOR = 'var(--dados-5)';
const COR_ANSIEDADE = 'var(--dados-2)';
const COR_BARRA = 'var(--dados-3)';

type ParDia = { data: string; humor: number | null; ansiedade: number | null };

const dica =
  (titulo: (rotulo: string) => string, unidade = '') =>
  ({ active, payload, label }: TooltipContentProps) =>
    active && payload.length > 0 ? (
      <div className={css.dica}>
        <p className={css.dicaTitulo}>{titulo(String(label))}</p>
        <ul>
          {payload.map((item) => (
            <li key={String(item.dataKey)}>
              {item.name}: {typeof item.value === 'number' ? `${formatarNumero(item.value)}${unidade}` : item.value}
            </li>
          ))}
        </ul>
      </div>
    ) : null;

function Moldura({ children }: { children: ReactNode }) {
  return (
    <div className={css.grafico}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function LegendaSeries() {
  return (
    <ul className={css.legenda} aria-label="Legenda">
      <li>
        <span className={css.amostraHumor} aria-hidden />
        Humor
      </li>
      <li>
        <span className={css.amostraAnsiedade} aria-hidden />
        Ansiedade
      </li>
    </ul>
  );
}

export function GraficoHumorAnsiedade({ dados }: { dados: ParDia[] }) {
  const ponto = (cor: string) => (dados.length <= MAX_DIAS_COM_PONTO ? { r: RAIO_PONTO, fill: cor } : false);
  return (
    <Moldura>
      <LineChart data={dados} margin={MARGEM}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="data" tickFormatter={formatarDataCurta} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
        <YAxis domain={[1, 10]} ticks={ESCALA_INTENSIDADE} width={LARGURA_EIXO_Y} tickLine={false} axisLine={false} />
        <Tooltip content={dica(formatarDataCurta)} isAnimationActive={false} />
        <Line dataKey="humor" name="Humor" stroke={COR_HUMOR} className={css.humor} dot={ponto(COR_HUMOR)} isAnimationActive={false} />
        <Line
          dataKey="ansiedade"
          name="Ansiedade"
          stroke={COR_ANSIEDADE}
          className={css.ansiedade}
          dot={ponto(COR_ANSIEDADE)}
          isAnimationActive={false}
        />
      </LineChart>
    </Moldura>
  );
}

type PontoColuna = { rotulo: string; valor: number | null };

// `poucas`: poucas colunas, então todos os rótulos do eixo e o valor sobre cada coluna cabem.
type PropsColunas = { dados: PontoColuna[]; nome: string; unidade?: string; poucas?: boolean };

export function GraficoColunas({ dados, nome, unidade, poucas }: PropsColunas) {
  return (
    <Moldura>
      <BarChart data={dados} margin={poucas ? MARGEM_COM_VALORES : MARGEM}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="rotulo" tickLine={false} interval={poucas ? 0 : 'preserveStartEnd'} minTickGap={24} />
        <YAxis width={LARGURA_EIXO_Y} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={dica(String, unidade)} cursor={{ fill: 'var(--cor-container-alto)' }} isAnimationActive={false} />
        <Bar
          dataKey="valor"
          name={nome}
          fill={COR_BARRA}
          maxBarSize={LARGURA_MAX_BARRA}
          radius={[RAIO_BARRA, RAIO_BARRA, 0, 0]}
          isAnimationActive={false}
        >
          {poucas && <LabelList dataKey="valor" position="top" />}
        </Bar>
      </BarChart>
    </Moldura>
  );
}

type BarraCategoria = { rotulo: string; quantidade: number; cor: string };

// Cada barra leva a cor fixa da emoção, e o rótulo da emoção fica no eixo: a cor nunca aparece sozinha.
export function GraficoBarrasHorizontais({ dados }: { dados: BarraCategoria[] }) {
  return (
    <Moldura>
      <BarChart data={dados} layout="vertical" margin={MARGEM}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" allowDecimals={false} tickLine={false} />
        <YAxis type="category" dataKey="rotulo" width={LARGURA_ROTULO_Y} tickLine={false} axisLine={false} />
        <Tooltip content={dica(String)} cursor={{ fill: 'var(--cor-container-alto)' }} isAnimationActive={false} />
        <Bar dataKey="quantidade" name="Registros" maxBarSize={LARGURA_MAX_BARRA} radius={[0, RAIO_BARRA, RAIO_BARRA, 0]} isAnimationActive={false}>
          {dados.map((barra) => (
            <Cell key={barra.rotulo} fill={barra.cor} />
          ))}
          <LabelList dataKey="quantidade" position="right" />
        </Bar>
      </BarChart>
    </Moldura>
  );
}
