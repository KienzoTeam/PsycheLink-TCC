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
        <AuthForm mode={authMode} onToggleMode={handleModeChange} />
      </main>
    </div>
  );
}