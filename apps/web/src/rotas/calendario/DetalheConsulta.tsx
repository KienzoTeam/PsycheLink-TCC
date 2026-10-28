import { useState, type FormEvent } from 'react';
import { Link } from 'react-aria-components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AvisoErro } from '../../components/ui/AvisoErro';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { StatusConsulta } from '../../components/ui/StatusConsulta';
import { TextField } from '../../components/ui/TextField';
import { notificar } from '../../components/ui/Toast';
import { invalidarConsultas } from '../../lib/cache';
import { codigoDeErro, mensagemDeErro } from '../../lib/erros';
import { formatarHora } from '../../lib/formatar';
import { alterarConsulta, remarcarConsulta, type Consulta } from '../../lib/psicologoApi';
import { camposDe, diaDoInstante, diaPorExtenso } from './agenda';
import { CamposHorario, intervaloDe, validarHorario, type Horario } from './CamposHorario';
import css from './Calendario.module.css';

export const MSG_CONFLITO = 'Já existe uma consulta neste horário.';
const MAX_OBSERVACAO = 2000;

type Modo = 'ver' | 'cancelar' | 'remarcar';

export function DetalheConsulta({ consulta, onClose }: { consulta: Consulta | null; onClose: () => void }) {
  const cliente = useQueryClient();
  const [modo, setModo] = useState<Modo>('ver');
  const [rascunho, setRascunho] = useState<string | null>(null);
  const [horario, setHorario] = useState<Horario | null>(null);
  const [tentou, setTentou] = useState(false);

  const observacao = rascunho ?? consulta?.observacao ?? '';
  const novoHorario = horario ?? (consulta ? camposDe(consulta.inicio, consulta.fim) : null);
  const erros = tentou && novoHorario ? validarHorario(novoHorario) : {};

  const encerrar = async (titulo: string) => {
    fechar();
    notificar({ titulo });
    await invalidarConsultas(cliente);
  };

  const mudarStatus = useMutation({
    mutationFn: (status: 'concluida' | 'cancelada') => alterarConsulta(consulta!.id, { status }),
    onSuccess: (_, status) => encerrar(status === 'concluida' ? 'Consulta concluída' : 'Consulta cancelada'),
  });
  const salvarObservacao = useMutation({
    mutationFn: () => alterarConsulta(consulta!.id, { observacao: observacao.trim() }),
    onSuccess: async () => {
      notificar({ titulo: 'Observação salva' });
      await invalidarConsultas(cliente);
    },
  });
  const remarcar = useMutation({
    mutationFn: () => remarcarConsulta(consulta!.id, intervaloDe(novoHorario!)),
    onSuccess: () => encerrar('Consulta remarcada'),
  });

  function fechar() {
    onClose();
    setModo('ver');
    setRascunho(null);
    setHorario(null);
    setTentou(false);
    mudarStatus.reset();
    salvarObservacao.reset();
    remarcar.reset();
  }

  function voltar() {
    setModo('ver');
    setTentou(false);
    mudarStatus.reset();
    remarcar.reset();
  }

  function enviarRemarcacao(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setTentou(true);
    if (novoHorario && Object.keys(validarHorario(novoHorario)).length === 0) remarcar.mutate();
  }

  const erro = (e: unknown, padrao: string) => (codigoDeErro(e) === 'CONFLITO_AGENDA' ? MSG_CONFLITO : mensagemDeErro(e, padrao));
  const agendada = consulta?.status === 'agendada';

  const acoes =
    modo === 'ver' ? (
      <>
        <Button variante="text" onPress={fechar}>
          Fechar
        </Button>
        {agendada && (
          <>
            <Button variante="outlined" onPress={() => setModo('remarcar')}>
              Remarcar
            </Button>
            <Button variante="outlined" onPress={() => setModo('cancelar')}>
              Cancelar consulta
            </Button>
            <Button isPending={mudarStatus.isPending} onPress={() => mudarStatus.mutate('concluida')}>
              Concluir
            </Button>
          </>
        )}
      </>
    ) : (
      <>
        <Button variante="text" onPress={voltar}>
          Voltar
        </Button>
        {modo === 'cancelar' ? (
          <Button isPending={mudarStatus.isPending} onPress={() => mudarStatus.mutate('cancelada')}>
            Cancelar consulta
          </Button>
        ) : (
          <Button type="submit" form="form-remarcar" isPending={remarcar.isPending}>
            Remarcar consulta
          </Button>
        )}
      </>
    );

  return (
    <Dialog
      titulo={consulta ? `Consulta de ${consulta.pacienteNome}` : 'Consulta'}
      isOpen={consulta !== null}
      onOpenChange={(aberto) => !aberto && fechar()}
      acoes={acoes}
      larga
    >
      {consulta && (
        <div className={css.form}>
          <dl className={css.dados}>
            <div>
              <dt>Paciente</dt>
              <dd>
                <Link href={`/pacientes/${consulta.pacienteId}`}>{consulta.pacienteNome}</Link>
              </dd>
            </div>
            <div>
              <dt>Data</dt>
              <dd>{diaPorExtenso(diaDoInstante(consulta.inicio))}</dd>
            </div>
            <div>
              <dt>Horário</dt>
              <dd>
                {formatarHora(consulta.inicio)} às {formatarHora(consulta.fim)}
              </dd>
            </div>
            <div>
              <dt>Situação</dt>
              <dd>
                <StatusConsulta status={consulta.status} />
              </dd>
            </div>
          </dl>

          {modo === 'ver' && (
            <form
              onSubmit={(evento) => {
                evento.preventDefault();
                salvarObservacao.mutate();
              }}
              className={css.form}
            >
              <TextField
                multilinha
                rotulo="Observação"
                descricao="Visível só para você."
                value={observacao}
                maxLength={MAX_OBSERVACAO}
                onChange={setRascunho}
              />
              <div>
                <Button
                  type="submit"
                  variante="tonal"
                  isDisabled={observacao.trim() === (consulta.observacao ?? '')}
                  isPending={salvarObservacao.isPending}
                >
                  Salvar observação
                </Button>
              </div>
            </form>
          )}

          {modo === 'cancelar' && <p>Cancelar esta consulta? Ela continua na agenda, marcada como cancelada.</p>}

          {modo === 'remarcar' && novoHorario && (
            <form id="form-remarcar" onSubmit={enviarRemarcacao} noValidate className={css.form}>
              <p>A consulta atual fica como remarcada e uma nova é criada no horário escolhido.</p>
              <CamposHorario valor={novoHorario} onChange={setHorario} erros={erros} />
            </form>
          )}

          {mudarStatus.isError && <AvisoErro>{erro(mudarStatus.error, 'Não foi possível atualizar a consulta.')}</AvisoErro>}
          {salvarObservacao.isError && <AvisoErro>{erro(salvarObservacao.error, 'Não foi possível salvar a observação.')}</AvisoErro>}
          {remarcar.isError && <AvisoErro>{erro(remarcar.error, 'Não foi possível remarcar a consulta.')}</AvisoErro>}
        </div>
      )}
    </Dialog>
  );
}
