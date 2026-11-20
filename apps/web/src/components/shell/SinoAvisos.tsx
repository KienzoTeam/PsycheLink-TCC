import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Dialog, DialogTrigger, Heading, Popover } from 'react-aria-components';
import { Bell } from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { formatarDataHora } from '../../lib/formatar';
import { listarAvisos, marcarAvisosLidos, type Aviso } from '../../lib/psicologoApi';
import css from './SinoAvisos.module.css';

const CHAVE = ['avisos'];

// Sino do painel (FP12): busca a cada 15 s com a aba visível; abrir marca tudo como lido. Aviso novo
// (SOS, escala respondida, recomendação feita...) recarrega o que estiver na tela, sem esperar o usuário.
export function SinoAvisos() {
  const cliente = useQueryClient();
  const navigate = useNavigate();
  const consulta = useQuery({ queryKey: CHAVE, queryFn: listarAvisos, refetchInterval: 15_000 });
  const ultimo = useRef<number | null>(null);
  const maisNovo = consulta.data?.avisos[0]?.id ?? 0;
  useEffect(() => {
    if (ultimo.current !== null && maisNovo > ultimo.current) {
      void cliente.invalidateQueries({ predicate: (q) => q.queryKey[0] !== CHAVE[0] });
    }
    if (consulta.data) ultimo.current = maisNovo;
  }, [maisNovo, consulta.data, cliente]);
  const lidos = useMutation({ mutationFn: marcarAvisosLidos, onSuccess: () => cliente.invalidateQueries({ queryKey: CHAVE }) });
  const naoLidas = consulta.data?.naoLidas ?? 0;
  const rotulo = naoLidas ? `Avisos, ${naoLidas} não ${naoLidas === 1 ? 'lido' : 'lidos'}` : 'Avisos';

  const abrir = (aviso: Aviso, fechar: () => void) => {
    if (!aviso.pacienteId) return;
    fechar();
    navigate(`/pacientes/${aviso.pacienteId}`);
  };

  return (
    <DialogTrigger onOpenChange={(aberto) => !aberto && naoLidas > 0 && lidos.mutate()}>
      <span className={css.ancora}>
        <IconButton aria-label={rotulo} icone={<Bell />} />
        {naoLidas > 0 && (
          <span className={css.selo} aria-hidden>
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        )}
      </span>
      <Popover placement="bottom end" className={css.popover}>
        <Dialog className={css.dialogo} aria-label="Avisos">
          {({ close }) => (
            <>
              <Heading slot="title" className={css.titulo}>
                Avisos
              </Heading>
              {consulta.isError ? (
                <p className={css.vazio}>Não foi possível carregar os avisos.</p>
              ) : !consulta.data ? (
                <p className={css.vazio}>Carregando…</p>
              ) : consulta.data.avisos.length === 0 ? (
                <p className={css.vazio}>Nenhum aviso por enquanto.</p>
              ) : (
                <ul className={css.lista}>
                  {consulta.data.avisos.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        className={css.item}
                        data-nova={!a.lida || undefined}
                        disabled={!a.pacienteId}
                        onClick={() => abrir(a, close)}
                      >
                        <span className={css.rotulo}>{a.rotulo}</span>
                        <span className={css.detalhe}>
                          {a.nome ? `${a.nome} · ` : ''}
                          {formatarDataHora(a.criadoEm)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
