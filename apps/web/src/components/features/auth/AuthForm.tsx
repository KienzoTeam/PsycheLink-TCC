import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../ui/Button";
import { Collapse } from "../../ui/Collapse";
import { TextField } from "../../ui/TextField";
import { TabToggle } from "./TabToggle";
import { useAuthStore } from "../../../store/authStore";
import type { AuthFormErrors, AuthMode } from "../../../types/auth";
import { useReplayOnChange } from "../../../hooks/useReplayOnChange";
import { validateLogin, validateRegister } from "../../../utils/validation";

export interface AuthFormProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
}

/**
 * Formulário de login/cadastro.
 *
 * Este componente permanece montado ao alternar entre os modos (ver
 * AuthLayout), então as transições são feitas via CSS em vez de depender de
 * remontagem:
 * - `Collapse` anima a altura de cada campo que aparece/desaparece (Nome,
 *   Confirmar senha) individualmente, como um acordeão.
 * - `useReplayOnChange` reaplica a animação `animate-auth-switch` (fade +
 *   slide vertical) no bloco de campos comuns sempre que `mode` muda, dando
 *   a sensação de "troca" mesmo sem desmontar nada.
 */
export function AuthForm({ mode, onModeChange }: AuthFormProps) {
  const navigate = useNavigate();
  const { user, loading, error, login, register } = useAuthStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<AuthFormErrors>({});

  const switchRef = useReplayOnChange(mode, "animate-auth-switch");

  useEffect(() => {
    document.title =
      mode === "login" ? "PsycheLink — Entrar" : "PsycheLink — Criar conta";
  }, [mode]);

  // Mock: assim que o login/cadastro "for bem-sucedido" (store popula `user`),
  // redireciona para o dashboard. Isso ainda não existe como página real da
  // API, mas evita deixar o usuário preso na tela de auth após o submit.
  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  // Limpa erros de validação ao trocar de aba (evita mensagens "presas" de
  // um modo no outro). Feito no handler de clique — não em um efeito — para
  // não disparar um setState síncrono a partir de outro render.
  const handleModeChange = (nextMode: AuthMode) => {
    setErrors({});
    onModeChange(nextMode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors =
      mode === "login"
        ? validateLogin({ email, password })
        : validateRegister({ name, email, password, confirmPassword });

    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    if (mode === "login") {
      await login({ email, password });
    } else {
      await register({ name, email, password, confirmPassword });
    }
  };

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

          <Collapse open={mode === "login"}>
            <div className="flex justify-end pb-4">
              {/* TODO(auth): implementar fluxo de recuperação de senha quando
                  a API existir. Desabilitado por enquanto para não simular
                  uma ação que ainda não existe. */}
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
