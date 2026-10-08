import { useState } from 'react';
import { brand } from '../theme';

type Modo = 'login' | 'cadastro';

const input = (placeholder: string, type = 'text', label?: string) => (
  <label style={{ display: 'grid', gap: 4, fontSize: 14 }}>
    {label ?? placeholder}
    <input
      type={type}
      placeholder={placeholder}
      required
      style={{
        padding: '10px 12px',
        borderRadius: brand.radius.md,
        border: `1px solid ${brand.outline}`,
        background: '#fff',
        color: brand.text,
      }}
    />
  </label>
);

export function AuthScreen({ onNeed2FA }: { onNeed2FA: (email: string) => void }) {
  const [modo, setModo] = useState<Modo>('login');
  const [email, setEmail] = useState('');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: brand.surface }}>
      <div
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

      <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 24, background: brand.background }}>
        <form
          onSubmit={(e) => { e.preventDefault(); onNeed2FA(email); }}
          style={{ width: 'min(360px, 100%)', display: 'grid', gap: 12, alignContent: 'start' }}
        >
          <div style={{ position: 'relative', display: 'flex', background: '#e6e9ef', borderRadius: brand.radius.full, padding: 4 }}>
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: 4, bottom: 4, left: 4, width: 'calc(50% - 4px)',
                borderRadius: brand.radius.full,
                background: brand.primary,
                transform: modo === 'login' ? 'translateX(0)' : 'translateX(100%)',
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
                  color: modo === m ? '#fff' : brand.text,
                  padding: '8px 0', borderRadius: brand.radius.full, zIndex: 1,
                  textTransform: 'capitalize',
                }}
              >
                {m === 'login' ? 'Login' : 'Cadastro'}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gap: 12 }} key={modo}>
            {modo === 'cadastro' && (
              <>
                {input('Nome completo')}
                {input('CRP (ex: 06/123456)')}
                {input('Área de atuação')}
              </>
            )}
            <label style={{ display: 'grid', gap: 4, fontSize: 14 }}>
              Email
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                style={{ padding: '10px 12px', borderRadius: brand.radius.md, border: `1px solid ${brand.outline}`, background: '#fff', color: brand.text }}
              />
            </label>
            {input('Senha', 'password', 'Senha')}
          </div>

          {modo === 'login' && (
            <button type="button" style={{ border: 0, background: 'transparent', color: brand.subtext, fontSize: 13, justifySelf: 'center' }}>
              Esqueci a senha
            </button>
          )}
          <button
            type="submit"
            style={{ padding: 12, borderRadius: brand.radius.md, border: `1px solid ${brand.outline}`, background: brand.surface, color: brand.text }}
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
