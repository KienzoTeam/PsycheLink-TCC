import { Card } from '../../components/ui/Card';
import { GraficoLinhas } from '../../components/ui/GraficoLinhas';
import { diaDe, formatarDataCurta } from '../../lib/formatar';
import type { Aplicacao } from '../../lib/psicologoApi';
import pagina from '../Pagina.module.css';

// Uma série por escala, da resposta mais antiga à mais nova.
export function porEscala(aplicacoes: readonly Aplicacao[]) {
  const grupos = new Map<string, Aplicacao[]>();
  for (const a of aplicacoes) {
    if (a.status === 'concluida' && a.respondidoEm) grupos.set(a.escala.sigla, [...(grupos.get(a.escala.sigla) ?? []), a]);
  }
  return [...grupos.values()].map((grupo) => grupo.sort((a, b) => a.respondidoEm!.localeCompare(b.respondidoEm!)));
}

export function Evolucao({ grupo }: { grupo: Aplicacao[] }) {
  const { sigla, nome, pontuacaoMaxima } = grupo[0]!.escala;
  const valores = grupo.map((a) => a.scoreTotal);
  return (
    <Card>
      <div className={pagina.secao}>
        <div>
          <h3 className={pagina.tituloSecao}>{sigla}: escore bruto por aplicação</h3>
          <p className={pagina.subtituloSecao}>
            {nome}. Escala de 0 a {pontuacaoMaxima}.
          </p>
        </div>
        <GraficoLinhas
          aria-label={`Escore bruto de ${sigla} em cada aplicação, de 0 a ${pontuacaoMaxima}: ${valores.join(', ')}`}
          rotulos={grupo.map((a) => formatarDataCurta(diaDe(a.respondidoEm!)))}
          series={[{ nome: sigla, valores }]}
          dominio={[0, pontuacaoMaxima]}
          marcas={[0, pontuacaoMaxima / 3, (2 * pontuacaoMaxima) / 3, pontuacaoMaxima]}
          valoresNosPontos
        />
      </div>
    </Card>
  );
}
