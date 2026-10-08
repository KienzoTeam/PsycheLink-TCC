import { useState } from 'react';
import { brand } from '../theme';

type Modo = 'login' | 'cadastro';

function Campo({ placeholder, type = 'text', label, required = true }: {
  placeholder: string;
  type?: string;
  label?: string;
  required?: boolean;
}) {
  return (
    <label style={{ display: 'grid', gap: 6, fontSize: 16 }}>
      {label ?? placeholder}
      <input
        type={type}
        placeholder={placeholder}
        required={required}
        style={{
          padding: '14px 16px',
          fontSize: 16,
          borderRadius: brand.radius.md,
          border: `1px solid ${brand.outline}`,
          background: '#fff',
          color: brand.text,
        }}
      />
    </label>
  );
}

// Bloco colapsável com grow/shrink + blur, sem fade (conforme wireframe).
function TrechoExpansivel({ aberto, blur, children }: {
  aberto: boolean;
  blur?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: aberto ? '1fr' : '0fr',
        transition: 'grid-template-rows 280ms ease',
      }}
    >
      <div
        style={{
          overflow: 'hidden',
          display: 'grid',
          gap: 16,
          alignContent: 'start',
          visibility: aberto ? 'visible' : 'hidden',
          filter: blur ? (aberto ? 'blur(0)' : 'blur(8px)') : undefined,
          transition: blur ? 'filter 280ms ease' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function AuthScreen({ onNeed2FA }: { onNeed2FA: (email: string) => void }) {
  const [modo, setModo] = useState<Modo>('login');
  const [email, setEmail] = useState('');
  const cadastro = modo === 'cadastro';

  return (
    <div className="auth-split" style={{ minHeight: '100vh', display: 'flex', background: brand.surface }}>
      <div
        className="auth-brand"
        style={{
          flex: 1,
          padding: 32,
          display: 'grid',
          placeContent: 'center',
          justifyItems: 'center',
          gap: 8,
          background: `linear-gradient(135deg, ${brand.gradient[0]}, ${brand.gradient[1]})`,
          color: '#fff',
          textAlign: 'center',
        }}
      >
        <div style={{ width: 72, height: 72, borderRadius: brand.radius.lg, border: '2px solid #fff', display: 'grid', placeItems: 'center' }}>
          Logo
        </div>
        <strong style={{ fontSize: 28 }}>PsycheLink</strong>
        <span style={{ opacity: 0.85 }}>[Acompanhamento psicológico contínuo]</span>
      </div>

      <div className="auth-formwrap" style={{ flex: 1.2, display: 'grid', placeItems: 'center', padding: 48, background: brand.background }}>
        <form
          onSubmit={(e) => { e.preventDefault(); onNeed2FA(email); }}
          style={{ width: 'min(460px, 100%)', display: 'grid', gap: 20, alignContent: 'start' }}
        >
          <div style={{ position: 'relative', display: 'flex', background: '#e6e9ef', borderRadius: brand.radius.full, padding: 4 }}>
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: 4, bottom: 4, left: 4, width: 'calc(50% - 4px)',
                borderRadius: brand.radius.full,
                background: brand.primary,
                transform: cadastro ? 'translateX(100%)' : 'translateX(0)',
                transition: 'transform 200ms ease',
              }}
            />
            {(['login', 'cadastro'] as Modo[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModo(m)}
                style={{
                  position: 'relative', flex: 1, border: 0, background: 'transparent',
                  color: (m === 'cadastro') === cadastro ? '#fff' : brand.text,
                  padding: '12px 0', borderRadius: brand.radius.full, zIndex: 1,
                  textTransform: 'capitalize', fontSize: 16,
                }}
              >
                {m === 'login' ? 'Login' : 'Cadastro'}
              </button>
            ))}
          </div>

          <TrechoExpansivel aberto={cadastro} blur>
            <Campo placeholder="Nome completo" required={cadastro} />
            <Campo placeholder="CRP (ex: 06/123456)" required={cadastro} />
            <Campo placeholder="Área de atuação" required={cadastro} />
          </TrechoExpansivel>

          <div style={{ display: 'grid', gap: 20 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 16 }}>
              Email
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                style={{ padding: '14px 16px', fontSize: 16, borderRadius: brand.radius.md, border: `1px solid ${brand.outline}`, background: '#fff', color: brand.text }}
              />
            </label>
            <Campo placeholder="Senha" type="password" label="Senha" />
          </div>

          <TrechoExpansivel aberto={!cadastro}>
            <button type="button" style={{ border: 0, background: 'transparent', color: brand.subtext, fontSize: 14, justifySelf: 'center' }}>
              Esqueci a senha
            </button>
          </TrechoExpansivel>

          <button
            type="submit"
            style={{ padding: 16, fontSize: 16, borderRadius: brand.radius.md, border: `1px solid ${brand.outline}`, background: brand.surface, color: brand.text }}
          >
            {cadastro ? 'Cadastrar' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
