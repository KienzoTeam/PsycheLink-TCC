import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button as BotaoAria, VisuallyHidden } from 'react-aria-components';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { MarcadorItem9 } from '../../components/ui/MarcadorItem9';
import { notificar } from '../../components/ui/Toast';
import { invalidarEscalas } from '../../lib/cache';
import { cx } from '../../lib/cx';
import { mensagemDeErro } from '../../lib/erros';
import { formatarDataHora } from '../../lib/formatar';
import { cancelarAplicacao, type Aplicacao } from '../../lib/psicologoApi';
import { STATUS_APLICACAO } from '../../lib/rotulos';
import { useCompacto } from '../../lib/useCompacto';
import linhas from '../Linhas.module.css';
import { DetalheAplicacao } from './DetalheAplicacao';
import css from './Escalas.module.css';

type Linha = Aplicacao & { pacienteNome?: string };

// Lista de aplicações da tela Escalas (com a coluna do paciente) e da aba Escalas do perfil (sem ela).
export function TabelaAplicacoes({ aplicacoes, rotulo, comPaciente }: { aplicacoes: readonly Linha[]; rotulo: string; comPaciente?: boolean }) {
  const compacto = useCompacto();
  const cliente = useQueryClient();
  const [aberta, setAberta] = useState<Linha | null>(null);
  const [cancelando, setCancelando] = useState<Linha | null>(null);

  const cancelar = useMutation({
    mutationFn: (id: number) => cancelarAplicacao(id),
    onSuccess: async () => {
      setCancelando(null);
      notificar({ titulo: 'Solicitação cancelada' });
      await invalidarEscalas(cliente);
    },
    onError: (erro) => {
      setCancelando(null);
      notificar({ titulo: 'Não foi possível cancelar a solicitação', descricao: mensagemDeErro(erro), tipo: 'erro' });
    },
  });

  return (
    <>
      <div className={cx(linhas.raiz, comPaciente ? css.colunasComPaciente : css.colunasSemPaciente)} data-compacto={compacto}>
        <table className={linhas.tabela} aria-label={rotulo}>
          <thead className={linhas.cabecalho}>
            <tr className={linhas.grade}>
              {comPaciente && <th scope="col">Paciente</th>}
              <th scope="col">Escala</th>
              <th scope="col">Situação</th>
              <th scope="col">Solicitada em</th>
              <th scope="col">Escore bruto</th>
              <th scope="col">
                <VisuallyHidden elementType="span">Ações</VisuallyHidden>
              </th>
            </tr>
          </thead>
          <tbody className={linhas.lista}>
            {aplicacoes.map((a) => {
              const concluida = a.status === 'concluida';
              const aberto = a.status === 'pendente' || a.status === 'em_andamento';
              const principal = comPaciente ? a.pacienteNome : a.escala.sigla;
              return (
                <tr key={a.id} className={cx(linhas.grade, linhas.linha)}>
                  <th scope="row">
                    {concluida ? (
                      <BotaoAria className={linhas.principal} aria-label={`${a.pacienteNome ? `${a.pacienteNome}, ` : ''}${a.escala.sigla}: ver respostas`} onPress={() => setAberta(a)}>
                        {principal}
                      </BotaoAria>
                    ) : (
                      <span className={css.principalTexto}>{principal}</span>
                    )}
                  </th>
                  {comPaciente && (
                    <td className={linhas.celula}>
                      <span className={linhas.rotulo}>Escala</span>
                      {a.escala.sigla}
                    </td>
                  )}
                  <td className={linhas.celula}>
                    <span className={linhas.rotulo}>Situação</span>
                    {STATUS_APLICACAO[a.status]}
                    {a.respondidoEm && <span className={css.apoio}>em {formatarDataHora(a.respondidoEm)}</span>}
                  </td>
                  <td className={linhas.celula}>
                    <span className={linhas.rotulo}>Solicitada em</span>
                    {formatarDataHora(a.solicitadoEm)}
                  </td>
                  <td className={linhas.celula}>
                    <span className={linhas.rotulo}>Escore bruto</span>
                    {a.scoreTotal === null ? (
                      'Sem resposta'
                    ) : (
                      <>
                        {a.scoreTotal} de {a.escala.pontuacaoMaxima}
                        {a.item9DiferenteDeZero && <MarcadorItem9 />}
                      </>
                    )}
                  </td>
                  <td className={cx(linhas.celula, css.acoes)}>
                    {aberto && (
                      <Button variante="text" aria-label={`Cancelar solicitação de ${a.escala.sigla}`} onPress={() => setCancelando(a)}>
                        Cancelar
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog
        titulo={aberta ? `${aberta.escala.sigla}${aberta.pacienteNome ? `, ${aberta.pacienteNome}` : ''}` : 'Escala'}
        isOpen={aberta !== null}
        onOpenChange={(estaAberto) => !estaAberto && setAberta(null)}
        acoes={
          <Button variante="tonal" onPress={() => setAberta(null)}>
            Fechar
          </Button>
        }
      >
        {aberta && <DetalheAplicacao id={aberta.id} />}
      </Dialog>

      <Dialog
        titulo="Cancelar esta solicitação?"
        isOpen={cancelando !== null}
        onOpenChange={(estaAberto) => !estaAberto && setCancelando(null)}
        acoes={
          <>
            <Button variante="text" onPress={() => setCancelando(null)}>
              Voltar
            </Button>
            <Button isPending={cancelar.isPending} onPress={() => cancelando && cancelar.mutate(cancelando.id)}>
              Cancelar solicitação
            </Button>
          </>
        }
      >
        {cancelando && `A escala ${cancelando.escala.sigla}${cancelando.pacienteNome ? ` de ${cancelando.pacienteNome}` : ''} deixa de aparecer no app do paciente. Isso não pode ser desfeito.`}
      </Dialog>
    </>
  );
}
