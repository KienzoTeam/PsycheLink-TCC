import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { VisuallyHidden } from 'react-aria-components';
import { FileDown } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ChipFiltro } from '../../components/ui/Chip';
import { DateRangePicker, ultimosDias, type Periodo } from '../../components/ui/DateRangePicker';
import { EstadoErro } from '../../components/ui/EstadoErro';
import { Select } from '../../components/ui/Select';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Skeleton } from '../../components/ui/Skeleton';
import { notificar } from '../../components/ui/Toast';
import { mensagemDeErro } from '../../lib/erros';
import { diaIso, diasDoPeriodo, MAX_DIAS_PERIODO } from '../../lib/periodo';
import {
  buscarRelatorio,
  listarTodosPacientes,
  registrarExportacao,
  type PedidoRelatorio,
} from '../../lib/psicologoApi';
import pagina from '../Pagina.module.css';
import { Relatorio } from './Relatorio';
import css from './Relatorios.module.css';

const TIPOS = [
  { id: 'geral', rotulo: 'Geral' },
  { id: 'paciente', rotulo: 'Paciente' },
];
const PERIODO_PADRAO_DIAS = 30;

export default function Relatorios() {
  const [tipo, setTipo] = useState('geral');
  const [pacienteId, setPacienteId] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<Periodo | null>(() => ultimosDias(PERIODO_PADRAO_DIAS));
  const [anotacoes, setAnotacoes] = useState(false);

  const pacientes = useQuery({ queryKey: ['seletor-pacientes'], queryFn: listarTodosPacientes });

  const periodoOk = periodo !== null && diasDoPeriodo(periodo) >= 1 && diasDoPeriodo(periodo) <= MAX_DIAS_PERIODO;
  const de = periodoOk ? diaIso(periodo.start) : '';
  const ate = periodoOk ? diaIso(periodo.end) : '';
  const individual = tipo === 'paciente';
  const pedido: PedidoRelatorio | null = !periodoOk
    ? null
    : !individual
      ? { tipo: 'geral', de, ate }
      : pacienteId === null
        ? null
        : { tipo: 'paciente', pacienteId: Number(pacienteId), incluirAnotacoes: anotacoes, de, ate };

  const previa = useQuery({
    queryKey: ['relatorio', pedido],
    queryFn: () => buscarRelatorio(pedido!),
    enabled: pedido !== null,
    placeholderData: keepPreviousData,
  });

  // A aba abre no clique, antes de esperar o servidor: depois de um await o navegador a bloquearia como pop-up.
  const exportar = useMutation({
    mutationFn: async (aba: Window) => {
      const numero = await registrarExportacao(pedido!);
      const url = new URLSearchParams({ tipo: pedido!.tipo, de, ate, numero: String(numero) });
      if (pedido!.tipo === 'paciente') {
        url.set('pacienteId', String(pedido!.pacienteId));
        url.set('incluirAnotacoes', String(pedido!.incluirAnotacoes));
      }
      aba.location.href = `/relatorios/imprimir?${url}`;
    },
    onError: (erro, aba) => {
      aba.close();
      notificar({ titulo: 'Não foi possível exportar o relatório', descricao: mensagemDeErro(erro), tipo: 'erro' });
    },
  });

  function aoExportar() {
    const aba = window.open('', '_blank');
    if (!aba) {
      notificar({ titulo: 'O navegador bloqueou a nova aba', descricao: 'Libere pop-ups para este site e tente de novo.', tipo: 'erro' });
      return;
    }
    aba.opener = null;
    exportar.mutate(aba);
  }

  return (
    <section className={pagina.tela} aria-labelledby="titulo-tela">
      <h1 id="titulo-tela" className={pagina.titulo}>
        Relatórios
      </h1>

      <div className={pagina.secao}>
        <div className={css.tipo}>
          <SegmentedControl aria-label="Tipo de relatório" opcoes={TIPOS} valor={tipo} onChange={setTipo} />
        </div>
        {individual && (
          <Select
            rotulo="Paciente"
            placeholder="Escolha o paciente"
            opcoes={(pacientes.data ?? []).map((p) => ({ id: String(p.id), rotulo: p.nome }))}
            valor={pacienteId}
            onChange={setPacienteId}
          />
        )}
        <DateRangePicker valor={periodo} onChange={setPeriodo} />
        {!periodoOk && (
          <p role="alert" className={css.erro}>
            Escolha um período de até {MAX_DIAS_PERIODO} dias, com início e fim.
          </p>
        )}
        {individual && (
          <div className={pagina.secao}>
            <div>
              <ChipFiltro isSelected={anotacoes} onChange={setAnotacoes}>
                Incluir anotações privadas
              </ChipFiltro>
            </div>
            <p className={pagina.subtituloSecao}>
              Desligado por padrão. Ligado, as suas anotações do período entram no relatório e no PDF, e a leitura fica registrada na
              auditoria. As observações de consulta nunca entram.
            </p>
          </div>
        )}
        <div>
          <Button icone={<FileDown />} isDisabled={pedido === null} isPending={exportar.isPending} onPress={aoExportar}>
            Exportar PDF
          </Button>
        </div>
        <p className={pagina.subtituloSecao}>
          Abre o relatório em uma nova aba, pronto para imprimir ou salvar como PDF. Cada exportação é registrada na auditoria com um
          número.
        </p>
      </div>

      <div className={pagina.secao} aria-busy={previa.isPlaceholderData}>
        <h2 className={pagina.tituloSecao}>Prévia</h2>
        {pedido === null ? (
          <p className={pagina.apoio}>{individual && periodoOk ? 'Escolha um paciente para ver a prévia.' : 'Defina o período para ver a prévia.'}</p>
        ) : previa.isError && !previa.data ? (
          <EstadoErro erro={previa.error} onTentar={() => void previa.refetch()} titulo="Não foi possível montar o relatório" />
        ) : !previa.data ? (
          <div role="status" className={pagina.esqueleto}>
            <VisuallyHidden>Montando a prévia</VisuallyHidden>
            <Skeleton forma="bloco" />
            <Skeleton forma="bloco" />
          </div>
        ) : (
          <Relatorio {...previa.data} />
        )}
      </div>
    </section>
  );
}
