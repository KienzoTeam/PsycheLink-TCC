import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CalendarDate } from '@internationalized/date';
import { AvisoErro } from '../../components/ui/AvisoErro';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Select } from '../../components/ui/Select';
import { TextField } from '../../components/ui/TextField';
import { notificar } from '../../components/ui/Toast';
import { invalidarConsultas } from '../../lib/cache';
import { codigoDeErro, mensagemDeErro } from '../../lib/erros';
import { criarConsulta, listarTodosPacientes } from '../../lib/psicologoApi';
import { CamposHorario, intervaloDe, validarHorario, type Horario } from './CamposHorario';
import { MSG_CONFLITO } from './DetalheConsulta';
import css from './Calendario.module.css';

// Duração habitual de uma sessão: só o valor inicial do campo, que o psicólogo ajusta.
const DURACAO_INICIAL = '50';
const HORA_INICIAL = '09:00';
const MAX_OBSERVACAO = 2000;

type Props = {
  isOpen: boolean;
  onOpenChange: (aberto: boolean) => void;
  dia: CalendarDate;
  // Vindo do perfil, o paciente já está escolhido.
  paciente?: { id: number; nome: string };
};

export function NovaConsulta({ isOpen, onOpenChange, dia, paciente }: Props) {
  const cliente = useQueryClient();
  const horarioInicial = { dia: dia.toString(), hora: HORA_INICIAL, minutos: DURACAO_INICIAL };
  const [pacienteId, setPacienteId] = useState<string | null>(null);
  const [horario, setHorario] = useState<Horario | null>(null);
  const [observacao, setObservacao] = useState('');
  const [tentou, setTentou] = useState(false);

  const pacientes = useQuery({ queryKey: ['seletor-pacientes'], queryFn: listarTodosPacientes, enabled: isOpen && !paciente });

  // Enquanto o psicólogo não mexe, a data acompanha o dia que a agenda mostra.
  const atual = horario ?? horarioInicial;
  const erros = tentou ? validarHorario(atual) : {};
  const alvo = paciente?.id ?? (pacienteId === null ? null : Number(pacienteId));

  const criar = useMutation({
    mutationFn: () =>
      criarConsulta({ pacienteId: alvo!, ...intervaloDe(atual), ...(observacao.trim() && { observacao: observacao.trim() }) }),
    onSuccess: async () => {
      mudar(false);
      notificar({ titulo: 'Consulta agendada' });
      await invalidarConsultas(cliente);
    },
  });

  function mudar(aberto: boolean) {
    onOpenChange(aberto);
    if (!aberto) {
      setPacienteId(null);
      setHorario(null);
      setObservacao('');
      setTentou(false);
      criar.reset();
    }
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setTentou(true);
    if (alvo !== null && Object.keys(validarHorario(atual)).length === 0) criar.mutate();
  }

  return (
    <Dialog
      titulo="Nova consulta"
      isOpen={isOpen}
      onOpenChange={mudar}
      acoes={
        <>
          <Button variante="text" onPress={() => mudar(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="form-nova-consulta" isDisabled={alvo === null} isPending={criar.isPending}>
            Agendar consulta
          </Button>
        </>
      }
    >
      <form id="form-nova-consulta" onSubmit={enviar} noValidate className={css.form}>
        {paciente ? (
          <p>
            Paciente: <strong>{paciente.nome}</strong>
          </p>
        ) : (
          <Select
            rotulo="Paciente"
            placeholder="Escolha o paciente"
            opcoes={(pacientes.data ?? []).map((p) => ({ id: String(p.id), rotulo: p.nome }))}
            valor={pacienteId}
            onChange={setPacienteId}
          />
        )}
        <CamposHorario valor={atual} onChange={setHorario} erros={erros} />
        <TextField
          multilinha
          rotulo="Observação (opcional)"
          descricao="Visível só para você."
          value={observacao}
          maxLength={MAX_OBSERVACAO}
          onChange={setObservacao}
        />
        {pacientes.isError && <AvisoErro>{mensagemDeErro(pacientes.error, 'Não foi possível carregar os pacientes.')}</AvisoErro>}
        {criar.isError && (
          <AvisoErro>
            {codigoDeErro(criar.error) === 'CONFLITO_AGENDA' ? MSG_CONFLITO : mensagemDeErro(criar.error, 'Não foi possível agendar a consulta.')}
          </AvisoErro>
        )}
      </form>
    </Dialog>
  );
}
