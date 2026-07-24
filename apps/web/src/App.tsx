import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthLayout } from "./components/features/auth/AuthLayout";
import { DashboardPage } from "./pages/DashboardPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Rota dinâmica única: trocar entre /login e /register é uma
            mudança de parâmetro de rota, não uma troca de rota — o React
            Router mantém <AuthLayout /> (e o formulário dentro dele)
            montado, permitindo que as transições de "switch" e de altura
            dos campos sejam animadas via CSS em vez de recomeçarem do zero. */}
        <Route path="/:authMode" element={<AuthLayout />} />

        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
