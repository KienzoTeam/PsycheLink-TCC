import { Navigate, useNavigate, useParams } from "react-router-dom";
import { AuthForm } from "./AuthForm";
import { BrandPanel } from "./BrandPanel";
import type { AuthMode } from "../../../types/auth";

const VALID_MODES: AuthMode[] = ["login", "register"];

function isAuthMode(value: string | undefined): value is AuthMode {
  return !!value && (VALID_MODES as string[]).includes(value);
}

/**
 * Layout compartilhado entre /login e /register: painel de marca + form.
 *
 * As duas rotas apontam para o mesmo padrão dinâmico (`/:authMode`, ver
 * App.tsx), então o React Router trata a navegação entre elas como uma
 * mudança de parâmetro — não como uma troca de rota — e mantém este
 * componente (e o `AuthForm` dentro dele) montado o tempo todo. Isso é o
 * que permite:
 *
 * - o painel de marca (`BrandPanel`) animar apenas uma vez, ao abrir a página;
 * - o `AuthForm` controlar suas próprias animações de "switch" e de altura
 *   por campo via CSS, em vez de reiniciar do zero a cada navegação.
 */
export function AuthLayout() {
  const { authMode } = useParams<{ authMode: string }>();
  const navigate = useNavigate();

  if (!isAuthMode(authMode)) {
    return <Navigate to="/login" replace />;
  }

  const handleModeChange = (nextMode: AuthMode) => {
    if (nextMode !== authMode) navigate(`/${nextMode}`);
  };

  return (
    <div className="flex min-h-dvh flex-col font-sans text-text lg:flex-row">
      <BrandPanel />
      <main className="flex flex-1 items-center justify-center bg-background p-6">
        <AuthForm mode={authMode} onModeChange={handleModeChange} />
      </main>
    </div>
  );
}
