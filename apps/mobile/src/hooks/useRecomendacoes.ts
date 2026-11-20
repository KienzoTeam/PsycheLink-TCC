import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  buscarRecomendacoes,
  marcarRecomendacaoFeita,
  Recomendacao,
} from '../lib/recomendacoesService';

/**
 * Recarrega quando a aba fica ativa. `lista` nula é o carregamento inicial (ou falha sem nada
 * carregado antes); `carregar` nunca rejeita, `marcarFeita` rejeita para o cartão mostrar o erro.
 */
export function useRecomendacoes(ativa: boolean) {
  const [lista, setLista] = useState<Recomendacao[] | null>(null);
  const [erro, setErro] = useState(false);
  // Só a requisição mais recente aplica o resultado: uma antiga que volta depois não desfaz a atualização.
  const ultima = useRef(0);

  const carregar = useCallback(async () => {
    const esta = ++ultima.current;
    setErro(false);
    try {
      const nova = await buscarRecomendacoes();
      if (esta === ultima.current) setLista(nova);
    } catch {
      if (esta === ultima.current) setErro(true);
    }
  }, []);

  const marcarFeita = useCallback(
    async (id: number) => {
      await marcarRecomendacaoFeita(id);
      // O cartão passa para "feitas" na hora; a recarga confirma com o servidor.
      const agora = new Date().toISOString();
      setLista((atual) => atual && atual.map((r) => (r.id === id ? { ...r, feitoEm: r.feitoEm ?? agora } : r)));
      void carregar();
    },
    [carregar],
  );

  useFocusEffect(
    useCallback(() => {
      if (ativa) void carregar();
    }, [ativa, carregar]),
  );

  return { lista, erro, carregar, marcarFeita };
}
