import { useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AvisoErro } from '../../components/ui/AvisoErro';
import { Button } from '../../components/ui/Button';
import { ConsentimentoAusente } from '../../components/ui/ConsentimentoAusente';
import { Dialog } from '../../components/ui/Dialog';
import { Select } from '../../components/ui/Select';
import { notificar } from '../../components/ui/Toast';
import { invalidarEscalas } from '../../lib/cache';
import { mensagemDeErro } from '../../lib/erros';
import { listarEscalas, listarTodosPacientes, solicitarEscala } from '../../lib/psicologoApi';
import css from './Escalas.module.css';

const MSG_SEM_CONSENTIMENTO = 'Este paciente não compartilha escalas. Peça que ele ative o compartilhamento no app para você solicitar.';
const MSG_JA_ABERTA = 'Já existe uma aplicação desta escala em aberto para este paciente. Cancele a anterior ou espere a resposta.';

const mensagemDoErro = (erro: unknown) => {
  const status = isAxiosError(erro) ? erro.response?.status : undefined;
  if (status === 403) return MSG_SEM_CONSENTIMENTO;
  if (status === 409) return MSG_JA_ABERTA;
  return mensagemDeErro(erro, 'Não foi possível solicitar a escala.');
};

type Props = {
  isOpen: boolean;
  onOpenChange: (aberto: boolean) => void;
  // Vindo do perfil, o paciente já está escolhido.
  paciente?: { id: number; nome: string };
};

export function SolicitarEscala({ isOpen, onOpenChange, paciente }: Props) {
  const cliente = useQueryClient();
  const [pacienteId, setPacienteId] = useState<string | null>(null);
  const [escalaId, setEscalaId] = useState<string | null>(null);

  const catalogo = useQuery({ queryKey: ['escalas', 'catalogo'], queryFn: listarEscalas, staleTime: Infinity, enabled: isOpen });
  const pacientes = useQuery({ queryKey: ['seletor-pacientes'], queryFn: listarTodosPacientes, enabled: isOpen && !paciente });

  const escolhido = pacientes.data?.find((p) => String(p.id) === pacienteId);
  const semConsentimento = escolhido !== undefined && !escolhido.compartilhaEscalas;
  const alvo = paciente?.id ?? (pacienteId === null ? null : Number(pacienteId));

  const solicitar = useMutation({
    mutationFn: () => solicitarEscala(alvo!, Number(escalaId)),
    onSuccess: async () => {
      mudar(false);
      notificar({ titulo: 'Escala solicitada', descricao: 'O paciente a vê no app para responder.' });
      await invalidarEscalas(cliente);
    },
  });

  function mudar(aberto: boolean) {
    onOpenChange(aberto);
    if (!aberto) {
      setPacienteId(null);
      setEscalaId(null);
      solicitar.reset();
    }
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (alvo !== null && escalaId !== null && !semConsentimento) solicitar.mutate();
  }

  return (
    <Dialog
      titulo="Solicitar escala"
      isOpen={isOpen}
      onOpenChange={mudar}
      acoes={
        <>
          <Button variante="text" onPress={() => mudar(false)}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-solicitar"
            isDisabled={alvo === null || escalaId === null || semConsentimento}
            isPending={solicitar.isPending}
          >
            Solicitar escala
          </Button>
        </>
      }
    >
      <form id="form-solicitar" onSubmit={enviar} noValidate className={css.form}>
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
        {semConsentimento && <ConsentimentoAusente>{MSG_SEM_CONSENTIMENTO}</ConsentimentoAusente>}
        <Select
          rotulo="Escala"
          placeholder="Escolha a escala"
          opcoes={(catalogo.data ?? []).map((e) => ({ id: String(e.id), rotulo: e.nome }))}
          valor={escalaId}
          onChange={setEscalaId}
          descricao="O resultado é o escore bruto. Não é diagnóstico."
        />
        {(pacientes.isError || catalogo.isError) && (
          <AvisoErro>{mensagemDeErro(pacientes.error ?? catalogo.error, 'Não foi possível carregar as opções.')}</AvisoErro>
        )}
        {solicitar.isError && <AvisoErro>{mensagemDoErro(solicitar.error)}</AvisoErro>}
      </form>
    </Dialog>
  );
}
