import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

/**
 * Placeholder até a tela real de dashboard ser construída. Existe apenas
 * para o mock de login/cadastro ter para onde redirecionar após "sucesso".
 */
export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-text">
      <p className="text-lg">
        Bem-vindo(a), <strong>{user.name}</strong> 👋
      </p>
      <p className="text-sm text-subtext">
        Esta é uma tela provisória — o dashboard real ainda será construído.
      </p>
      <button
        type="button"
        onClick={() => {
          logout();
          navigate("/login");
        }}
        className="rounded-xl bg-surface px-4 py-2 text-sm text-text transition-colors hover:brightness-110"
      >
        Sair
      </button>
    </div>
  );
}
