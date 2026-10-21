import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { buscarConsultas, Consultas } from '../lib/consultasService';

/** Recarrega a cada foco. `dados` nulo sem `erro` é o carregamento inicial; `carregar` nunca rejeita. */
export function useConsultas() {
  const [dados, setDados] = useState<Consultas | null>(null);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    setErro(false);
    try {
      setDados(await buscarConsultas());
    } catch {
      setErro(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  return { dados, erro, carregar };
}
