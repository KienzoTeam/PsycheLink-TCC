import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { encerrarSessao } from '../lib/sessao';
import { brand } from '../theme';

export function Fab() {
  const [aberto, setAberto] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function sair() {
    try {
      // Invalida a sessão no servidor (todas as sessões anteriores deste usuário).
      await api.post('/auth/logout');
    } catch {
      // Se o token já expirou, o efeito prático é o mesmo: encerrar localmente.
    }
    encerrarSessao();
    queryClient.clear();
    navigate('/', { replace: true });
  }

  return (
    <div style={{ position: 'fixed', right: 24, bottom: 24, display: 'grid', justifyItems: 'end', gap: 8, zIndex: 40 }}>
      {aberto && (
        <div style={{ display: 'grid', gap: 8, background: brand.surface, border: `1px solid ${brand.outline}`, borderRadius: brand.radius.lg, padding: 8, minWidth: 180 }}>
          <button
            onClick={sair}
            style={{ border: `1px solid ${brand.outline}`, background: 'transparent', color: brand.text, borderRadius: brand.radius.md, padding: '8px 12px', textAlign: 'left' }}
          >
            Sair
          </button>
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
