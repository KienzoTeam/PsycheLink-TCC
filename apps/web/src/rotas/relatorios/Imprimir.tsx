import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { VisuallyHidden } from 'react-aria-components';
import { Printer, TriangleAlert } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { EstadoErro } from '../../components/ui/EstadoErro';
import { Skeleton } from '../../components/ui/Skeleton';
import { lerDia, MAX_DIAS_PERIODO } from '../../lib/periodo';
import { buscarRelatorio, type PedidoRelatorio } from '../../lib/psicologoApi';
import { Relatorio } from './Relatorio';
import css from './Imprimir.module.css';

const inteiro = (texto: string | null) => (texto !== null && /^\d+$/.test(texto) ? Number(texto) : null);

// Rota aberta em nova aba pela tela Relatórios, depois que a exportação foi registrada na auditoria.
export default function Imprimir() {
  const [params] = useSearchParams();
  const tipo = params.get('tipo');
  const de = lerDia(params.get('de'));
  const ate = lerDia(params.get('ate'));
  const numero = inteiro(params.get('numero'));
  const pacienteId = inteiro(params.get('pacienteId'));
  const incluirAnotacoes = params.get('incluirAnotacoes') === 'true';
  const dias = de && ate ? ate.compare(de) + 1 : 0;
  const periodoOk = de !== null && ate !== null && dias >= 1 && dias <= MAX_DIAS_PERIODO;
  const pedido: PedidoRelatorio | null =
    numero === null || !periodoOk
      ? null
      : tipo === 'geral'
        ? { tipo, de: de.toString(), ate: ate.toString() }
        : tipo === 'paciente' && pacienteId !== null
          ? { tipo, pacienteId, incluirAnotacoes, de: de.toString(), ate: ate.toString() }
          : null;

  const consulta = useQuery({
    queryKey: ['relatorio', pedido],
    queryFn: () => buscarRelatorio(pedido!),
    enabled: pedido !== null,
    staleTime: Infinity,
  });
  const relatorio = consulta.data;

  // O papel é branco: a folha sai no tema claro, mesmo com o tema escuro escolhido (sem salvar a preferência).
  useEffect(() => {
    const raiz = document.documentElement;
    const anterior = raiz.dataset.theme;
    raiz.dataset.theme = 'light';
    return () => {
      raiz.dataset.theme = anterior;
    };
  }, []);

  // O título vira o nome do arquivo sugerido no "Salvar como PDF".
  useEffect(() => {
    if (numero !== null) document.title = `Relatório nº ${numero}`;
  }, [numero]);

  // Abre a impressão sozinha quando a folha está na tela e as fontes carregaram.
  useEffect(() => {
    if (!relatorio) return;
    let cancelado = false;
    void document.fonts.ready.then(() => {
      if (!cancelado) requestAnimationFrame(() => window.print());
    });
    return () => {
      cancelado = true;
    };
  }, [relatorio]);

  if (pedido === null) {
    return (
      <main className={css.estado}>
        <VisuallyHidden elementType="h1">Relatório para impressão</VisuallyHidden>
        <EmptyState
          icone={<TriangleAlert />}
          titulo="Endereço do relatório inválido"
          descricao="Volte para Relatórios, escolha o período e use Exportar PDF."
        />
      </main>
    );
  }

  return (
    <main className={css.pagina}>
      <VisuallyHidden elementType="h1">Relatório para impressão</VisuallyHidden>
      {consulta.isError ? (
        <div className={css.estado}>
          <EstadoErro erro={consulta.error} onTentar={() => void consulta.refetch()} titulo="Não foi possível montar o relatório" />
        </div>
      ) : !relatorio ? (
        <div role="status" className={css.carregando}>
          <VisuallyHidden>Montando o relatório</VisuallyHidden>
          <Skeleton forma="titulo" />
          <Skeleton forma="bloco" />
        </div>
      ) : (
        <>
          <div className={css.acoes}>
            <Button icone={<Printer />} onPress={() => window.print()}>
              Imprimir ou salvar como PDF
            </Button>
          </div>
          <Relatorio {...relatorio} numero={numero ?? undefined} impressao />
        </>
      )}
    </main>
  );
}
