import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { mensagemDeErro } from '../lib/erros';
import { brand } from '../theme';

const INTERVALO_REENVIO = 60;

/** Confirma o código de 6 dígitos enviado por e-mail (endpoint /auth/verificar-email). */
export function VerificarEmailModal({
  email,
  onConfirmado,
  onFechar,
}: {
  email: string;
  onConfirmado: () => void;
  onFechar: () => void;
}) {
  const [digitos, setDigitos] = useState<string[]>(Array(6).fill(''));
  const [segundos, setSegundos] = useState(INTERVALO_REENVIO);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const completo = digitos.every((d) => d !== '');

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (segundos <= 0) return;
    const timer = setTimeout(() => setSegundos((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [segundos]);

  function alterar(indice: number, valor: string) {
    const digito = valor.replace(/\D/g, '').slice(-1);
    setDigitos((anterior) => {
      const proximo = [...anterior];
      proximo[indice] = digito;
      return proximo;
    });
    if (digito && indice < 5) refs.current[indice + 1]?.focus();
  }

  function colar(texto: string) {
    const limpo = texto.replace(/\D/g, '').slice(0, 6);
    if (!limpo) return;
    setDigitos(Array.from({ length: 6 }, (_, i) => limpo[i] ?? ''));
    refs.current[Math.min(limpo.length, 5)]?.focus();
  }

  async function confirmar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setAviso(null);
    setEnviando(true);
    try {
      await api.post('/auth/verificar-email', { email, codigo: Number(digitos.join('')) });
      onConfirmado();
    } catch (erroReq) {
      setErro(mensagemDeErro(erroReq, 'Não foi possível confirmar o código.'));
    } finally {
      setEnviando(false);
    }
  }

  async function reenviar() {
    setErro(null);
    setAviso(null);
    try {
      await api.post('/auth/reenviar-codigo', { email });
      setAviso('Novo código enviado.');
      setSegundos(INTERVALO_REENVIO);
    } catch (erroReq) {
      setErro(mensagemDeErro(erroReq, 'Não foi possível reenviar o código.'));
    }
  }

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="Verificação de e-mail"
      onClick={onFechar}
      style={{ position: 'fixed', inset: 0, background: 'rgba(17,17,27,.6)', display: 'grid', placeItems: 'center', zIndex: 50 }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={confirmar}
        style={{ background: '#1e1e2e', color: '#cdd6f4', borderRadius: brand.radius.xl, padding: 28, width: 'min(380px, 92vw)', display: 'grid', gap: 12, justifyItems: 'center' }}
      >
        <h2 style={{ margin: 0, fontSize: 20 }}>Confirme seu e-mail</h2>
        <span style={{ fontSize: 13, opacity: 0.8, textAlign: 'center' }}>
          Digite o código de 6 dígitos enviado para {email}.
        </span>

        <div style={{ display: 'flex', gap: 8 }}>
          {digitos.map((digito, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              value={digito}
              inputMode="numeric"
              maxLength={1}
              aria-label={`Dígito ${i + 1}`}
              onChange={(e) => alterar(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && !digitos[i] && i > 0) refs.current[i - 1]?.focus();
              }}
              onPaste={(e) => {
                e.preventDefault();
                colar(e.clipboardData.getData('text'));
              }}
              style={{ width: 44, height: 52, textAlign: 'center', fontSize: 20, borderRadius: brand.radius.md, border: '1px solid #585b70', background: 'transparent', color: 'inherit' }}
            />
          ))}
        </div>

        {erro && <span role="alert" style={{ fontSize: 13, color: '#f38ba8' }}>{erro}</span>}
        {aviso && <span role="status" style={{ fontSize: 13, color: '#a6e3a1' }}>{aviso}</span>}

        <button
          type="submit"
          disabled={!completo || enviando}
          style={{ width: '100%', padding: 12, borderRadius: brand.radius.md, border: '1px solid #585b70', background: 'transparent', color: 'inherit', opacity: !completo || enviando ? 0.5 : 1 }}
        >
          Confirmar
        </button>

        <button
          type="button"
          onClick={reenviar}
          disabled={segundos > 0}
          style={{ border: 0, background: 'transparent', color: 'inherit', fontSize: 13, opacity: segundos > 0 ? 0.5 : 0.9 }}
        >
          {segundos > 0 ? `Reenviar código em ${segundos}s` : 'Reenviar código'}
        </button>
      </form>
    </div>
  );
}
