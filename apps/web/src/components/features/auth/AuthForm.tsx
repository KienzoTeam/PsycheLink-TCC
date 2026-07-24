import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../ui/Button";
import { Reveal } from "../../ui/Reveal";
import { TextField } from "../../ui/TextField";
import { TabToggle } from "./TabToggle";
import { useAuthStore } from "../../../store/authStore";
import type { AuthFormErrors, AuthMode } from "../../../types/auth";
import { useAutoHeight } from "../../../hooks/useAutoHeight";
import { validateLogin, validateRegister } from "../../../utils/validation";

export interface AuthFormProps {
  mode: AuthMode;
}

/**
 * Formulário de login/cadastro. Cada instância é montada para um único
 * `mode` — a troca de aba navega para a rota irmã (`/login` ou `/register`),
 * o que remonta este componente e reinicia o estado do formulário.
 */
export function AuthForm({ mode }: AuthFormProps) {
  const navigate = useNavigate();
  const { user, loading, error, login, register } = useAuthStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<AuthFormErrors>({});

  const { ref: contentRef, height } = useAutoHeight<HTMLDivElement>([errors]);

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

  const handleModeChange = (nextMode: AuthMode) => {
    if (nextMode !== mode) navigate(`/${nextMode}`);
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
        <div
          className="transition-all duration-500 ease-in-out-expo"
          style={{ height: height ? `${height}px` : "auto" }}
        >
          <div className="space-y-4" ref={contentRef}>
            {mode === "register" && (
              <Reveal delay="0.1s">
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
              </Reveal>
            )}

            <Reveal delay="0.2s">
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
            </Reveal>

            <Reveal delay="0.3s">
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
            </Reveal>

            {mode === "login" && (
              <Reveal delay="0.4s" className="flex justify-end">
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
              </Reveal>
            )}

            {mode === "register" && (
              <Reveal delay="0.4s">
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
              </Reveal>
            )}

            {error && (
              <p className="text-sm text-mocha-red" role="alert">
                {error}
              </p>
            )}

            <Reveal delay="0.5s">
              <Button
                type="submit"
                loading={loading}
                loadingLabel={mode === "login" ? "Entrando..." : "Cadastrando..."}
              >
                {mode === "login" ? "Entrar" : "Criar conta"}
              </Button>
            </Reveal>
          </div>
        </div>
      </form>
    </div>
  );
}
