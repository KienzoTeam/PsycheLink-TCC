import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { OtpField } from '../../components/ui/OtpField';
import { ESPERA_REENVIO_MS } from '../../lib/authApi';
import { mensagemDeErro } from '../../lib/erros';
import css from './VerificacaoCodigo.module.css';

const DIGITOS = 6;

type Props = {
  isOpen: boolean;
  onOpenChange: (aberto: boolean) => void;
  titulo: string;
  instrucao: string;
  email: string;
  /** Instante (ms) em que o reenvio é liberado. */
  reenviarEm: number;
  /** Rejeitar mostra a mensagem e limpa as caixas; resolver significa que o chamador seguiu em frente. */
  onConfirmar: (codigo: string) => Promise<void>;
  /** Devolve o instante (ms) em que um novo reenvio será liberado. */
  onReenviar: () => Promise<number>;
};

function formatarRestante(ms: number) {
  const segundos = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
}

function Corpo({ instrucao, email, reenviarEm, onConfirmar, onReenviar }: Omit<Props, 'isOpen' | 'onOpenChange' | 'titulo'>) {
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string>();
  const [aviso, setAviso] = useState<string>();
  const [enviando, setEnviando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  // Trocar a chave remonta as caixas: limpa o código e devolve o foco à primeira.
  const [rodada, setRodada] = useState(0);
  const [liberaEm, setLiberaEm] = useState(reenviarEm);
  const [agora, setAgora] = useState(() => Date.now());
  const esperando = agora < liberaEm;

  useEffect(() => {
    if (!esperando) return;
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [esperando]);

  const reiniciarCaixas = () => {
    setCodigo('');
    setRodada((r) => r + 1);
  };

  async function confirmar(valor: string) {
    if (enviando) return;
    if (valor.length < DIGITOS) {
      setErro(`Digite os ${DIGITOS} dígitos do código.`);
      return;
    }
    setEnviando(true);
    setErro(undefined);
    setAviso(undefined);
    try {
      await onConfirmar(valor);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
      reiniciarCaixas();
    } finally {
      setEnviando(false);
    }
  }

  async function reenviar() {
    setReenviando(true);
    setErro(undefined);
    setAviso(undefined);
    let proximo = Date.now() + ESPERA_REENVIO_MS;
    try {
      proximo = await onReenviar();
      setAviso('Enviamos um novo código.');
      reiniciarCaixas();
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setLiberaEm(proximo);
      setAgora(Date.now());
      setReenviando(false);
    }
  }

  return (
    <div className={css.corpo}>
      <p>{instrucao}</p>
      <OtpField
        key={rodada}
        autoFocus
        rotulo="Código de verificação"
        valor={codigo}
        onChange={(valor) => {
          if (enviando) return;
          setCodigo(valor);
          setErro(undefined);
          if (valor.length === DIGITOS) void confirmar(valor);
        }}
        erro={erro}
      />
      {aviso && (
        <p role="status" className={css.aviso}>
          {aviso}
        </p>
      )}
      <p className={css.email}>Este é seu e-mail: {email}</p>
      <Button isPending={enviando} onPress={() => void confirmar(codigo)}>
        Confirmar
      </Button>
      <div className={css.reenvio}>
        {esperando && <p className={css.contagem}>Reenviar em {formatarRestante(liberaEm - agora)}</p>}
        <Button variante="text" isDisabled={esperando} isPending={reenviando} onPress={() => void reenviar()}>
          Reenviar e-mail
        </Button>
      </div>
    </div>
  );
}

export function VerificacaoCodigo({ isOpen, onOpenChange, titulo, ...corpo }: Props) {
  return (
    <Dialog titulo={titulo} isOpen={isOpen} onOpenChange={onOpenChange}>
      <Corpo {...corpo} />
    </Dialog>
  );
}
