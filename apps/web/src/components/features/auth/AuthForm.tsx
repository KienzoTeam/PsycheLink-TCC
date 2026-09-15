import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "../../ui/Button";
import { Collapse } from "../../ui/Collapse";
import { TextField } from "../../ui/TextField";
import { TabToggle } from "./TabToggle";
import { CodeVerificationForm } from "./CodeVerificationForm";
import { useAuthStore } from "../../../store/authStore";
import type { AuthFormErrors, AuthMode } from "../../../types/auth";
import { useReplayOnChange } from "../../../hooks/useReplayOnChange";
import { validateLogin, validateRegister } from "../../../utils/validation";

export interface AuthFormProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
}

/** dd/mm/aaaa -> aaaa-mm-dd (formato aceito pelo backend). */
function paraIso(dataBr: string): string {
  const [dia, mes, ano] = dataBr.split("/");
  return dia && mes && ano ? `${ano}-${mes}-${dia}` : dataBr;
}

/**
 * Formulário de login/cadastro.
 *
 * Este componente permanece montado ao alternar entre os modos (ver
 * AuthLayout), então as transições são feitas via CSS em vez de depender de
 * remontagem:
 * - `Collapse` anima a altura de cada campo que aparece/desaparece (Nome,
 *   Data de nascimento, Confirmar senha) individualmente, como um acordeão.
 * - `useReplayOnChange` reaplica a animação `animate-auth-switch` (fade +
 *   slide vertical) no bloco de campos comuns sempre que `mode` muda.
 *
 * Depois de um cadastro, ou de um login bloqueado por e-mail ainda não
 * confirmado, o formulário dá lugar à tela de código de verificação
 * (`CodeVerificationForm`); assim que o código é confirmado, tentamos logar
 * automaticamente com as credenciais já digitadas.
 */
export function AuthForm({ mode, onModeChange }: AuthFormProps) {
  const navigate = useNavigate();
  const { user, loading, error, login, register, clearError } = useAuthStore();

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<AuthFormErrors>({});

  const [step, setStep] = useState<"form" | "verify">("form");
  const [pendingEmail, setPendingEmail] = useState("");

  const switchRef = useReplayOnChange(mode, "animate-auth-switch");

  useEffect(() => {
    document.title =
      mode === "login" ? "PsycheLink — Entrar" : "PsycheLink — Criar conta";
  }, [mode]);

  // Assim que o login for bem-sucedido (store popula `user`), redireciona.
  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  // Limpa erros de validação/API ao trocar de aba, evitando mensagens
  // "presas" de um modo no outro.
  const handleModeChange = (nextMode: AuthMode) => {
    setErrors({});
    clearError();
    setStep("form");
    onModeChange(nextMode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (mode === "login") {
      const validationErrors = validateLogin({ email, password });
      setErrors(validationErrors);
      if (Object.keys(validationErrors).length > 0) return;

      try {
        await login({ email, password });
      } catch (err) {
        // E-mail cadastrado mas ainda não confirmado: manda para a tela de
        // código em vez de deixar a pessoa presa numa mensagem de erro.
        if (axios.isAxiosError(err) && err.response?.data?.codigo === "EMAIL_NAO_VERIFICADO") {
          setPendingEmail(email);
          setStep("verify");
        }
      }
      return;
    }

    const validationErrors = validateRegister({
      name,
      email,
      password,
      confirmPassword,
      birthDate,
    });
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      const result = await register({
        nome: name,
        email,
        password,
        dataNascimento: paraIso(birthDate),
      });
      if (result.precisaVerificacao) {
        setPendingEmail(email);
        setStep("verify");
      }
    } catch {
      // Mensagem de erro já fica disponível via `error` do store.
    }
  };

  // Depois de confirmar o código, tenta logar com as credenciais já
  // digitadas para não deixar a pessoa ter que preencher tudo de novo.
  const handleVerified = async () => {
    try {
      await login({ email: pendingEmail, password });
    } catch {
      setStep("form");
      onModeChange("login");
    }
  };

  if (step === "verify") {
    return (
      <CodeVerificationForm
        email={pendingEmail}
        onVerified={handleVerified}
        onBack={() => setStep("form")}
      />
    );
  }

  return (
    <div className="w-full max-w-sm animate-[fadeSlideIn_0.9s_var(--ease-in-out-expo)_0.15s_both]">
      <TabToggle mode={mode} onChange={handleModeChange} />

      <form onSubmit={handleSubmit} noValidate>
        <div ref={switchRef} className="animate-auth-switch">
          <Collapse open={mode === "register"}>
            <div className="pb-4">
              <TextField
                id="name"
                label="Nome completo"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                autoComplete="name"
                error={errors.name}
              />
            </div>
          </Collapse>

          <div className="pb-4">
            <TextField
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoComplete="email"
              error={errors.email}
            />
          </div>

          <div className="pb-4">
            <TextField
              id="password"
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              error={errors.password}
            />
          </div>

          <Collapse open={mode === "register"}>
            <div className="pb-4">
              <TextField
                id="confirmPassword"
                label="Confirmar senha"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                error={errors.confirmPassword}
              />
            </div>
          </Collapse>

          <Collapse open={mode === "register"}>
            <div className="pb-4">
              <TextField
                id="birthDate"
                label="Data de nascimento"
                type="text"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                placeholder="dd/mm/aaaa"
                autoComplete="bday"
                error={errors.birthDate}
              />
            </div>
          </Collapse>

          <Collapse open={mode === "login"}>
            <div className="flex justify-end pb-4">
              {/* TODO(auth): a API já suporta redefinição de senha
                  (/esqueci-senha, /verificar-codigo-senha, /redefinir-senha)
                  — falta só ligar essa tela a ela. */}
              <button
                type="button"
                disabled
                title="Em breve"
                className="text-xs text-subtext/50 cursor-not-allowed"
              >
                Esqueceu a senha?
              </button>
            </div>
          </Collapse>

          {error && (
            <p className="mb-4 text-sm text-mocha-red" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            loading={loading}
            loadingLabel={mode === "login" ? "Entrando..." : "Cadastrando..."}
          >
            {mode === "login" ? "Entrar" : "Criar conta"}
          </Button>
        </div>
      </form>
    </div>
  );
}
