import { Navigate, Outlet } from "react-router-dom";
import { Spinner } from "./ui/Spinner";
import { useAuthStore } from "../store/authStore";

/**
 * Bloqueia rotas que exigem sessão ativa.
 *
 * Enquanto a sessão ainda está sendo restaurada a partir do token salvo
 * (`initializing`), mostramos um loading em vez de redirecionar de imediato
 * — evita mandar para /login alguém que na verdade está autenticado, só
 * porque o `/me` ainda não respondeu.
 */
export function ProtectedRoute() {
  const { user, initializing } = useAuthStore();

  if (initializing) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
