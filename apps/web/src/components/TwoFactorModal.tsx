import { useEffect, useRef, useState } from 'react';
import { brand } from '../theme';

// honey: mock de countdown; backend enviará expiração real do código.
export function TwoFactorModal({
  email, onConfirm, onClose,
}: {
  email: string;
  onConfirm: (codigo: string) => void;
  onClose: () => void;
}) {
  const [digitos, setDigitos] = useState<string[]>(Array(6).fill(''));
  const [restam, setRestam] = useState(60);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    refs.current[0]?.focus();
    const t = setInterval(() => setRestam((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const set = (i: number, v: string) => {
    const d = v.replace(/\D/g, '').slice(-1);
    setDigitos((prev) => { const n = [...prev]; n[i] = d; return n; });
    if (d && i < 5) refs.current[i + 1]?.focus();
  };

  return (
    <div
      role="dialog" aria-modal aria-label="Verificação de 2 etapas"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(17,17,27,.6)', display: 'grid', placeItems: 'center', zIndex: 50 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#1e1e2e', color: '#cdd6f4', borderRadius: brand.radius.xl, padding: 28, width: 'min(380px, 92vw)', display: 'grid', gap: 12, justifyItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Verificação de 2 Etapas</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {digitos.map((d, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              value={d}
              inputMode="numeric"
              maxLength={1}
              aria-label={`Dígito ${i + 1}`}
              onChange={(e) => set(i, e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Backspace' && !digitos[i] && i > 0) refs.current[i - 1]?.focus(); }}
              onPaste={(e) => {
                const txt = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                if (txt) { e.preventDefault(); setDigitos(txt.padEnd(6, '').split('').slice(0, 6)); refs.current[Math.min(txt.length, 5)]?.focus(); }
              }}
              style={{ width: 44, height: 52, textAlign: 'center', fontSize: 20, borderRadius: brand.radius.md, border: '1px solid #585b70', background: 'transparent', color: 'inherit' }}
            />
          ))}
        </div>
        <span style={{ fontSize: 13, opacity: 0.8 }}>Este é seu email: {email || '[email]'}</span>
        <span style={{ fontSize: 13, opacity: 0.8 }}>{restam > 0 ? `${Math.floor(restam / 60)}:${String(restam % 60).padStart(2, '0')} restantes para reenviar` : 'Código expirado — solicite reenvio'}</span>
        <button
          onClick={() => onConfirm(digitos.join(''))}
          disabled={digitos.some((d) => !d)}
          style={{ width: '100%', padding: 12, borderRadius: brand.radius.md, border: '1px solid #585b70', background: 'transparent', color: 'inherit', opacity: digitos.some((d) => !d) ? 0.5 : 1 }}
        >
          Confirmar
        </button>
        <button onClick={() => setRestam(60)} style={{ border: 0, background: 'transparent', color: 'inherit', fontSize: 13, opacity: 0.8 }}>
          Reenviar e-mail
        </button>
      </div>
    </div>
  );
}
