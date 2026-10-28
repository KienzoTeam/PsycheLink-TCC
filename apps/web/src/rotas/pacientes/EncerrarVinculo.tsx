import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleAlert } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { TextField } from '../../components/ui/TextField';
import { notificar } from '../../components/ui/Toast';
import { mensagemDeErro } from '../../lib/erros';
import { primeiroNome } from '../../lib/formatar';
import { encerrarVinculo } from '../../lib/psicologoApi';
import css from './EncerrarVinculo.module.css';

// Telas que listam ou resumem pacientes: depois de encerrar, todas precisam reler o servidor.
const CONSULTAS_AFETADAS = ['pacientes', 'seletor-pacientes', 'dashboard', 'checkins', 'vinculo'];

export function EncerrarVinculo({ paciente }: { paciente: { id: number; nome: string } }) {
  const navigate = useNavigate();
  const cliente = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [digitado, setDigitado] = useState('');
  const nome = primeiroNome(paciente.nome);
  const confere = digitado.trim().localeCompare(nome, 'pt-BR', { sensitivity: 'base' }) === 0;

  const encerrar = useMutation({
    mutationFn: () => encerrarVinculo(paciente.id),
    onSuccess: () => {
      // Navega antes de limpar: o perfil não pode reler um paciente que deixou de existir para este psicólogo.
      navigate('/pacientes');
      cliente.removeQueries({ queryKey: ['paciente', paciente.id] });
      for (const chave of CONSULTAS_AFETADAS) void cliente.invalidateQueries({ queryKey: [chave] });
      notificar({ titulo: 'Vínculo encerrado', descricao: `Você não acessa mais os registros de ${paciente.nome}.` });
    },
  });

  function mudar(estaAberto: boolean) {
    setAberto(estaAberto);
    if (!estaAberto) {
      setDigitado('');
      encerrar.reset();
    }
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (confere) encerrar.mutate();
  }

  return (
    <>
      <Button variante="outlined" onPress={() => setAberto(true)}>
        Encerrar vínculo
      </Button>
      <Dialog
        titulo={`Encerrar vínculo com ${paciente.nome}?`}
        isOpen={aberto}
        onOpenChange={mudar}
        acoes={
          <>
            <Button variante="text" onPress={() => mudar(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="form-encerrar" isDisabled={!confere} isPending={encerrar.isPending}>
              Encerrar vínculo
            </Button>
          </>
        }
      >
        <form id="form-encerrar" onSubmit={enviar} noValidate className={css.form}>
          <p>
            O acesso aos registros deste paciente termina agora. Para voltar a acompanhá-lo, ele precisa usar um novo código de
            vínculo.
          </p>
          <TextField
            rotulo={`Digite o primeiro nome do paciente (${nome}) para confirmar`}
            value={digitado}
            onChange={setDigitado}
            autoComplete="off"
          />
          {encerrar.isError && (
            <p role="alert" className={css.erro}>
              <CircleAlert aria-hidden />
              {mensagemDeErro(encerrar.error, 'Não foi possível encerrar o vínculo.')}
            </p>
          )}
        </form>
      </Dialog>
    </>
  );
}
