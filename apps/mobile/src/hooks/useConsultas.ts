import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { buscarConsultas, Consultas } from '../lib/consultasService';

/** Recarrega a cada foco. `dados` nulo sem `erro` é o carregamento inicial; `carregar` nunca rejeita. */
export function useConsultas() {
  const [dados, setDados] = useState<Consultas | null>(null);
  const [erro, setErro] = useState(false);
  // Só a requisição mais recente aplica o resultado: uma antiga que volta depois não desfaz a atualização.
  const ultima = useRef(0);

  const carregar = useCallback(async () => {
    const esta = ++ultima.current;
    setErro(false);
    try {
      const novos = await buscarConsultas();
      if (esta === ultima.current) setDados(novos);
    } catch {
      if (esta === ultima.current) setErro(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  return { dados, erro, carregar };
}
