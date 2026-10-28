import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { VisuallyHidden } from 'react-aria-components';
import { CircleAlert, Copy, KeyRound } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Dialog } from '../../components/ui/Dialog';
import { EstadoErro } from '../../components/ui/EstadoErro';
import { ListItem } from '../../components/ui/ListItem';
import { Skeleton } from '../../components/ui/Skeleton';
import { notificar } from '../../components/ui/Toast';
import { mensagemDeErro } from '../../lib/erros';
import { formatarData, formatarDataHora } from '../../lib/formatar';
import {
  gerarCodigoVinculo,
  listarCodigos,
  listarHistoricoVinculos,
  revogarCodigo,
  type CodigoGerado,
  type CodigoVinculo,
  type StatusCodigo,
} from '../../lib/psicologoApi';
import { STATUS_CODIGO } from '../../lib/rotulos';
import pagina from '../Pagina.module.css';
import css from './Vinculo.module.css';

const SEGUNDO_MS = 1000;
const DIGITOS_POR_GRUPO = 3;

const doisDigitos = (n: number) => String(n).padStart(2, '0');

function formatarRestante(ms: number) {
  const total = Math.floor(ms / SEGUNDO_MS);
  return `${doisDigitos(Math.floor(total / 3600))}:${doisDigitos(Math.floor((total % 3600) / 60))}:${doisDigitos(total % 60)}`;
}

function CodigoNaTela({ gerado }: { gerado: CodigoGerado }) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const relogio = setInterval(() => setAgora(Date.now()), SEGUNDO_MS);
    return () => clearInterval(relogio);
  }, []);
  const restante = new Date(gerado.expiraEm).getTime() - agora;
  const expirado = restante <= 0;
  const grupos = `${gerado.codigo.slice(0, DIGITOS_POR_GRUPO)} ${gerado.codigo.slice(DIGITOS_POR_GRUPO)}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(gerado.codigo);
      notificar({ titulo: 'Código copiado' });
    } catch {
      notificar({ titulo: 'Não foi possível copiar', descricao: 'Selecione o código na tela e copie à mão.', tipo: 'erro' });
    }
  }

  return (
    <div className={css.gerado}>
      <p className={css.codigo}>
        <VisuallyHidden elementType="span">Código de vínculo: {gerado.codigo.split('').join(' ')}.</VisuallyHidden>
        <span aria-hidden>{grupos}</span>
      </p>
      <p role="timer" className={css.restante}>
        {expirado ? 'Este código expirou. Gere outro.' : `Expira em ${formatarRestante(restante)}`}
      </p>
      {!expirado && (
        <Button variante="tonal" icone={<Copy />} onPress={() => void copiar()}>
          Copiar código
        </Button>
      )}
      <p className={css.instrucao}>
        Passe este código ao paciente. No app PsycheLink, ele informa o código para se vincular a você. Vale para um só uso e por 24
        horas. Por segurança, o código não é mostrado de novo depois que você sair desta tela.
      </p>
    </div>
  );
}

const APOIO_CODIGO: Record<StatusCodigo, (c: CodigoVinculo) => string> = {
  ativo: (c) => `Expira em ${formatarDataHora(c.expiraEm)}`,
  expirado: (c) => `Expirou em ${formatarDataHora(c.expiraEm)}`,
  usado: (c) => `Usado em ${formatarDataHora(c.usadoEm ?? c.expiraEm)}`,
  revogado: (c) => `Revogado em ${formatarDataHora(c.revogadoEm ?? c.expiraEm)}`,
};

function ListaEsqueleto({ rotulo }: { rotulo: string }) {
  return (
    <div role="status" className={pagina.esqueleto}>
      <VisuallyHidden>{rotulo}</VisuallyHidden>
      <Skeleton forma="bloco" />
      <Skeleton forma="bloco" />
    </div>
  );
}

export default function Vinculo() {
  const cliente = useQueryClient();
  const [revogando, setRevogando] = useState<CodigoVinculo | null>(null);

  const codigos = useQuery({ queryKey: ['vinculo', 'codigos'], queryFn: listarCodigos });
  const historico = useQuery({ queryKey: ['vinculo', 'historico'], queryFn: listarHistoricoVinculos });

  // gcTime 0: o código em claro sai da memória do cache assim que o componente sai de cena.
  const gerar = useMutation({
    mutationFn: gerarCodigoVinculo,
    gcTime: 0,
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['vinculo', 'codigos'] }),
  });

  const revogar = useMutation({
    mutationFn: revogarCodigo,
    onSuccess: async () => {
      setRevogando(null);
      notificar({ titulo: 'Código revogado' });
      await cliente.invalidateQueries({ queryKey: ['vinculo', 'codigos'] });
    },
    onError: (erro) => {
      setRevogando(null);
      notificar({ titulo: 'Não foi possível revogar o código', descricao: mensagemDeErro(erro), tipo: 'erro' });
    },
  });

  return (
    <section className={pagina.tela} aria-labelledby="titulo-tela">
      <h1 id="titulo-tela" className={pagina.titulo}>
        Vínculo
      </h1>

      <Card className={css.novo}>
        <div className={pagina.secao}>
          <h2 className={pagina.tituloSecao}>
            Vincular um paciente
          </h2>
          <p className={pagina.apoio}>Gere um código de 6 dígitos e passe ao paciente. Cada código serve a um único paciente.</p>
          <div>
            <Button icone={<KeyRound />} isPending={gerar.isPending} onPress={() => gerar.mutate()}>
              {gerar.data ? 'Gerar outro código' : 'Gerar código'}
            </Button>
          </div>
          {gerar.isError && (
            <p role="alert" className={css.erro}>
              <CircleAlert aria-hidden />
              {mensagemDeErro(gerar.error, 'Não foi possível gerar o código.')}
            </p>
          )}
        </div>
        {gerar.data && <CodigoNaTela key={gerar.data.id} gerado={gerar.data} />}
      </Card>

      <div className={pagina.grade}>
        <div className={pagina.secao}>
          <h2 className={pagina.tituloSecao}>Códigos gerados</h2>
          {codigos.isPending ? (
            <ListaEsqueleto rotulo="Carregando códigos" />
          ) : codigos.isError ? (
            <EstadoErro erro={codigos.error} onTentar={() => void codigos.refetch()} titulo="Não foi possível carregar os códigos" />
          ) : codigos.data.length === 0 ? (
            <p className={pagina.apoio}>Nenhum código gerado ainda.</p>
          ) : (
            <Card className={css.lista}>
              <ul>
                {codigos.data.map((c) => (
                  <ListItem
                    key={c.id}
                    titulo={`Criado em ${formatarDataHora(c.criadoEm)}`}
                    apoio={APOIO_CODIGO[c.status](c)}
                    fim={
                      <span className={css.fim}>
                        <Chip>{STATUS_CODIGO[c.status]}</Chip>
                        {c.status === 'ativo' && (
                          <Button variante="text" onPress={() => setRevogando(c)}>
                            Revogar
                          </Button>
                        )}
                      </span>
                    }
                  />
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className={pagina.secao}>
          <h2 className={pagina.tituloSecao}>Histórico de vínculos</h2>
          {historico.isPending ? (
            <ListaEsqueleto rotulo="Carregando histórico" />
          ) : historico.isError ? (
            <EstadoErro erro={historico.error} onTentar={() => void historico.refetch()} titulo="Não foi possível carregar o histórico" />
          ) : historico.data.length === 0 ? (
            <p className={pagina.apoio}>Nenhum vínculo ainda. Quando um paciente usar um código seu, ele aparece aqui.</p>
          ) : (
            <Card className={css.lista}>
              <ul>
                {historico.data.map((v) => (
                  <ListItem
                    key={`${v.pacienteId}-${v.vinculadoEm}`}
                    href={v.status === 'ativo' ? `/pacientes/${v.pacienteId}` : undefined}
                    titulo={v.nome}
                    apoio={
                      `Vinculado em ${formatarData(v.vinculadoEm)}` +
                      (v.encerradoEm
                        ? `. Encerrado em ${formatarData(v.encerradoEm)}${v.encerradoPor === 'psicologo' ? ' por você' : v.encerradoPor === 'paciente' ? ' pelo paciente' : ''}`
                        : '')
                    }
                    fim={<Chip>{v.status === 'ativo' ? 'Ativo' : 'Encerrado'}</Chip>}
                  />
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <Dialog
        titulo="Revogar este código?"
        isOpen={revogando !== null}
        onOpenChange={(aberto) => !aberto && setRevogando(null)}
        acoes={
          <>
            <Button variante="text" onPress={() => setRevogando(null)}>
              Cancelar
            </Button>
            <Button isPending={revogar.isPending} onPress={() => revogando && revogar.mutate(revogando.id)}>
              Revogar código
            </Button>
          </>
        }
      >
        O paciente não poderá mais usar este código. Isso não pode ser desfeito.
      </Dialog>
    </section>
  );
}
