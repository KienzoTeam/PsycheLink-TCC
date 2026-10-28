import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export function useSair() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return async function sair() {
    try {
      await api.post('/auth/psicologo/logout');
    } catch {
      // A sessão pode já ter expirado: o resultado local é o mesmo.
    }
    queryClient.clear();
    navigate('/', { replace: true });
  };
}
