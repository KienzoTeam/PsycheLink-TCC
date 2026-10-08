import { useState } from 'react';
import { brand } from '../theme';

const OPCOES = ['Configurações', 'Meu perfil', 'Tema', 'Logout'] as const;

export function Fab() {
  const [aberto, setAberto] = useState(false);
  return (
    <div style={{ position: 'fixed', right: 24, bottom: 24, display: 'grid', justifyItems: 'end', gap: 8, zIndex: 40 }}>
      {aberto && (
        <div style={{ display: 'grid', gap: 8, background: brand.surface, border: `1px solid ${brand.outline}`, borderRadius: brand.radius.lg, padding: 8, minWidth: 180 }}>
          {OPCOES.map((o) => (
            <button key={o} style={{ border: `1px solid ${brand.outline}`, background: 'transparent', color: brand.text, borderRadius: brand.radius.md, padding: '8px 12px', textAlign: 'left' }}>
              {o}
            </button>
          ))}
        </div>
      )}
      <button
        aria-label="Menu do perfil"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        style={{ width: 52, height: 52, borderRadius: '50%', border: 0, background: '#e64553', color: '#fff', fontSize: 20 }}
      >
        ●
      </button>
    </div>
  );
}
