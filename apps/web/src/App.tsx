import { useState } from 'react';
import { Route, Routes, useNavigate } from 'react-router';
import { AuthScreen } from './components/AuthScreen';
import { TwoFactorModal } from './components/TwoFactorModal';
import { Dashboard } from './components/Dashboard';

function LoginRoute() {
  const nav = useNavigate();
  const [email2FA, setEmail2FA] = useState<string | null>(null);
  return (
    <>
      <AuthScreen onNeed2FA={(email) => setEmail2FA(email)} />
      {email2FA !== null && (
        <TwoFactorModal
          email={email2FA}
          onClose={() => setEmail2FA(null)}
          onConfirm={() => { setEmail2FA(null); nav('/inicio'); }}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route index element={<LoginRoute />} />
      <Route path="inicio" element={<Dashboard />} />
      <Route path="*" element={<LoginRoute />} />
    </Routes>
  );
}
