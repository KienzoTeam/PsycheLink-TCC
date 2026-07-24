import { Outlet } from "react-router-dom";
import { BrandPanel } from "./BrandPanel";

/**
 * Layout compartilhado entre /login e /register: painel de marca + form.
 *
 * Este componente é montado uma única vez pela rota pai (ver App.tsx) e
 * permanece montado ao alternar entre /login e /register — só o `<Outlet />`
 * (o formulário) troca. Isso garante que a animação de entrada do painel de
 * marca (`BrandPanel`) rode apenas uma vez, ao abrir a página, e não a cada
 * troca de aba Entrar/Cadastro.
 */
export function AuthLayout() {
  return (
    <div className="flex min-h-dvh flex-col font-sans text-text lg:flex-row">
      <BrandPanel />
      <main className="flex flex-1 items-center justify-center bg-background p-6">
        <Outlet />
      </main>
    </div>
  );
}
