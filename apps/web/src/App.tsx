import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthLayout } from "./components/features/auth/AuthLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuthStore } from "./store/authStore";

export function App() {
  const fetchMe = useAuthStore((state) => state.fetchMe);

  // Tenta restaurar a sessão a partir do token salvo assim que o app sobe.
  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Redireciona a raiz para /login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Rota dinâmica única: trocar entre /login e /register é uma
            mudança de parâmetro, não uma troca de rota — o AuthLayout (e o
            AuthForm dentro dele) permanece montado, permitindo animações via
            CSS em vez de recomeçar do zero a cada navegação. */}
        <Route path="/:authMode" element={<AuthLayout />} />

        {/* Rotas protegidas */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
