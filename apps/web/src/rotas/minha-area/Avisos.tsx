import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AvisoErro } from '../../components/ui/AvisoErro';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Checkbox } from '../../components/ui/Checkbox';
import { EstadoErro } from '../../components/ui/EstadoErro';
import { Skeleton } from '../../components/ui/Skeleton';
import { notificar } from '../../components/ui/Toast';
import { mensagemDeErro } from '../../lib/erros';
import { buscarPreferenciasAvisos, salvarPreferenciaAviso, type PreferenciaAviso } from '../../lib/psicologoApi';
import { ativarPush, desativarPush, inscricaoAtual, pushSuportado } from '../../lib/pushNavegador';
import pagina from '../Pagina.module.css';
import css from './Avisos.module.css';

const CHAVE = ['avisos', 'preferencias'];
const CANAIS = [
  { id: 'painel', rotulo: 'Painel' },
  { id: 'email', rotulo: 'E-mail' },
  { id: 'push', rotulo: 'Navegador' },
] as const;

function PushNeste({ chave }: { chave: string | null }) {
  const [ativo, setAtivo] = useState<boolean | null>(null);
  useEffect(() => {
    void inscricaoAtual().then((i) => setAtivo(i !== null));
  }, []);
  const alternar = useMutation({
    mutationFn: async () => {
      if (ativo) return desativarPush().then(() => 'desativado' as const);
      return ativarPush(chave!);
    },
    onSuccess: (r) => {
      if (r === 'negado') return notificar({ titulo: 'O navegador bloqueou as notificações. Libere nas configurações do site.' });
      setAtivo(r === 'ativado');
    },
  });

  if (!pushSuportado()) return <p className={pagina.subtituloSecao}>Este navegador não recebe notificações push.</p>;
  if (!chave) return <p className={pagina.subtituloSecao}>O push do navegador ainda não foi configurado no servidor.</p>;
  return (
    <div className={pagina.secao}>
      <p className={pagina.subtituloSecao}>
        {ativo ? 'Este navegador recebe os avisos marcados em "Navegador".' : 'Ative para receber os avisos mesmo com a aba fechada.'}
      </p>
      <div>
        <Button variante={ativo ? 'outlined' : 'filled'} isPending={alternar.isPending || ativo === null} onPress={() => alternar.mutate()}>
          {ativo ? 'Desativar neste navegador' : 'Ativar neste navegador'}
        </Button>
      </div>
      {alternar.isError && <AvisoErro>{mensagemDeErro(alternar.error, 'Não foi possível mudar o push deste navegador.')}</AvisoErro>}
    </div>
  );
}

export function Avisos() {
  const cliente = useQueryClient();
  const consulta = useQuery({ queryKey: CHAVE, queryFn: buscarPreferenciasAvisos });
  const salvar = useMutation({
    mutationFn: salvarPreferenciaAviso,
    onSuccess: (tipos) => cliente.setQueryData(CHAVE, (atual: { chavePush: string | null } | undefined) => ({ tipos, chavePush: atual?.chavePush ?? null })),
  });

  if (consulta.isError) return <EstadoErro erro={consulta.error} onTentar={() => void consulta.refetch()} titulo="Não foi possível carregar os avisos" />;
  if (!consulta.data) return <Skeleton forma="bloco" />;

  const mudar = (p: PreferenciaAviso, canal: (typeof CANAIS)[number]['id'], valor: boolean) => salvar.mutate({ ...p, [canal]: valor });

  return (
    <div className={css.pilha}>
      <Card>
        <div className={pagina.secao}>
          <h2 className={pagina.tituloSecao}>Avisos</h2>
          <p className={pagina.subtituloSecao}>
            Escolha por onde receber cada aviso. O e-mail e o navegador não trazem o nome nem dados do paciente: só o tipo do
            aviso.
          </p>
          <table className={css.tabela}>
            <thead>
              <tr>
                <th scope="col">Aviso</th>
                {CANAIS.map((c) => (
                  <th key={c.id} scope="col">
                    {c.rotulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {consulta.data.tipos.map((p) => (
                <tr key={p.tipo}>
                  <th scope="row">{p.rotulo}</th>
                  {CANAIS.map((c) => (
                    <td key={c.id}>
                      <Checkbox isSelected={p[c.id]} onChange={(v) => mudar(p, c.id, v)} aria-label={`${p.rotulo}: ${c.rotulo}`}>
                        <span className={css.rotuloCelula}>{c.rotulo}</span>
                      </Checkbox>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className={pagina.subtituloSecao}>
            O aviso de SOS só informa que o paciente abriu a tela (e só se ele permitiu). Não é um pedido de atendimento: o
            app orienta o paciente a ligar para o 188 ou o 192 em situação de risco.
          </p>
          {salvar.isError && <AvisoErro>{mensagemDeErro(salvar.error, 'Não foi possível salvar.')}</AvisoErro>}
        </div>
      </Card>
      <Card>
        <div className={pagina.secao}>
          <h2 className={pagina.tituloSecao}>Push neste navegador</h2>
          <PushNeste chave={consulta.data.chavePush} />
        </div>
      </Card>
    </div>
  );
}
