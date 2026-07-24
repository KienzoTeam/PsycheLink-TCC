import { AuthForm } from "./AuthForm";
import { BrandPanel } from "./BrandPanel";

/**
 * Layout compartilhado entre /login e /register: painel de marca + form.
 * Extraído para evitar duplicar o layout em cada página de auth.
 */
export function AuthLayout({ mode }: { mode: "login" | "register" }) {
  return (
    <div className="flex min-h-dvh flex-col font-sans text-text lg:flex-row">
      <BrandPanel />
      <main className="flex flex-1 items-center justify-center bg-background p-6">
        <AuthForm mode={mode} />
      </main>
    </div>
  );
}
