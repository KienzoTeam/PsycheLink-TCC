import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

/**
 * Placeholder até a tela real de dashboard ser construída. Existe para o
 * login/cadastro terem para onde ir depois de autenticar de verdade.
 */
export function DashboardPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  // ProtectedRoute já garante que não chegamos aqui sem usuário autenticado,
  // mas o guard evita um flash de "undefined" caso o estado mude no meio do caminho.
  if (!user) return null;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-text">
      <p className="text-lg">
        Bem-vindo(a), <strong>{user.nome}</strong> 👋
      </p>
      <p className="text-sm text-subtext">
        Esta é uma tela provisória — o dashboard real ainda será construído.
      </p>
      {!user.email_verificado && (
        <p className="text-sm text-mocha-yellow">
          Atenção: este e-mail ainda não está marcado como confirmado.
        </p>
      )}
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
