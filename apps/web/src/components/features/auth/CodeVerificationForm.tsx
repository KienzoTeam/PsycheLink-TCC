import { useState } from "react";
import { Button } from "../../ui/Button";
import { TextField } from "../../ui/TextField";
import { authApi, getApiErrorMessage } from "../../../services/api";

interface CodeVerificationFormProps {
  email: string;
  /** Chamado após o código ser confirmado com sucesso pelo backend. */
  onVerified: () => void | Promise<void>;
  onBack: () => void;
}

/**
 * Tela de confirmação do código de 6 dígitos enviado por e-mail.
 *
 * Aparece depois de um cadastro (`precisaVerificacao: true`) ou de uma
 * tentativa de login em uma conta cujo e-mail ainda não foi confirmado
 * (`EMAIL_NAO_VERIFICADO`). Usa os mesmos componentes de UI (TextField,
 * Button) e tokens de cor do restante do formulário de autenticação.
 */
export function CodeVerificationForm({ email, onVerified, onBack }: CodeVerificationFormProps) {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authApi.verificarEmail(email, Number(codigo));
      setSuccessMsg("E-mail confirmado com sucesso!");
      await onVerified();
    } catch (err) {
      setError(getApiErrorMessage(err, "Código inválido ou expirado."));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setSuccessMsg("");
    setResending(true);
    try {
      await authApi.reenviarCodigo(email);
      setSuccessMsg("Um novo código foi enviado para o seu e-mail.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Erro ao reenviar código."));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-sm animate-[fadeSlideIn_0.9s_var(--ease-in-out-expo)_0.15s_both]">
      <div className="mb-6 text-center">
        <h2 className="font-serif text-2xl italic text-primary">Confirme seu e-mail</h2>
        <p className="mt-1 text-sm text-subtext">
          Enviamos um código de 6 dígitos para <strong className="text-text">{email}</strong>
        </p>
      </div>

      <form onSubmit={handleVerify} noValidate>
        <div className="pb-4">
          <TextField
            id="codigo"
            label="Código de verificação"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={6}
            placeholder="123456"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
          />
        </div>

        {error && (
          <p className="mb-4 text-sm text-mocha-red" role="alert">
            {error}
          </p>
        )}
        {successMsg && (
          <p className="mb-4 text-sm text-mocha-green" role="status">
            {successMsg}
          </p>
        )}

        <Button type="submit" loading={loading} loadingLabel="Verificando...">
          Confirmar código
        </Button>
      </form>

      <div className="mt-4 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-subtext hover:text-text disabled:opacity-60"
        >
          {resending ? "Enviando..." : "Reenviar código"}
        </button>
        <button type="button" onClick={onBack} className="text-primary hover:underline">
          Voltar
        </button>
      </div>
    </div>
  );
}
