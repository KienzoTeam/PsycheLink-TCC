import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { isAxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { VisuallyHidden } from 'react-aria-components';
import { Info, LogOut } from 'lucide-react';
import { SeletorTema } from '../../components/shell/SeletorTema';
import { useSair } from '../../components/shell/useSair';
import { AvisoErro } from '../../components/ui/AvisoErro';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Dialog } from '../../components/ui/Dialog';
import { EstadoErro } from '../../components/ui/EstadoErro';
import { ListItem } from '../../components/ui/ListItem';
import { PasswordField } from '../../components/ui/PasswordField';
import { Skeleton } from '../../components/ui/Skeleton';
import { Tabs } from '../../components/ui/Tabs';
import { TextField } from '../../components/ui/TextField';
import { notificar } from '../../components/ui/Toast';
import { mensagemDeErro } from '../../lib/erros';
import { formatarDataHora, plural } from '../../lib/formatar';
import {
  atualizarMe,
  buscarMe,
  encerrarOutrasSessoes,
  excluirConta,
  listarSessoes,
  trocarSenha,
  type Psicologo,
} from '../../lib/psicologoApi';
import pagina from '../Pagina.module.css';
import css from './MinhaArea.module.css';

// Mesmos limites do servidor (registroSchema, contaSchema e senhaSchema).
const NOME_MIN = 2;
const NOME_MAX = 120;
const ESPECIALIDADE_MAX = 255;
const SENHA_MIN = 8;
const SENHA_MAX = 72;
const CHAVE_ME = ['psicologo', 'me'];
const ABAS = ['perfil', 'senha', 'sessoes', 'preferencias'] as const;

function PerfilConta({ psicologo }: { psicologo: Psicologo }) {
  const cliente = useQueryClient();
  const [nome, setNome] = useState(psicologo.nome);
  const [especialidade, setEspecialidade] = useState(psicologo.especialidade ?? '');
  const [tentou, setTentou] = useState(false);

  const nomeErro = nome.trim().length < NOME_MIN || nome.trim().length > NOME_MAX ? `Informe o nome com ${NOME_MIN} a ${NOME_MAX} caracteres.` : undefined;
  const especialidadeErro = especialidade.trim().length > ESPECIALIDADE_MAX ? `Use até ${ESPECIALIDADE_MAX} caracteres.` : undefined;

  const salvar = useMutation({
    mutationFn: () => atualizarMe({ nome: nome.trim(), especialidade: especialidade.trim() }),
    onSuccess: (atualizado) => {
      cliente.setQueryData(CHAVE_ME, atualizado);
      notificar({ titulo: 'Perfil atualizado' });
    },
  });

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setTentou(true);
    if (!nomeErro && !especialidadeErro) salvar.mutate();
  }

  return (
    <Card>
      <form onSubmit={enviar} noValidate className={css.formulario}>
        <h2 className={pagina.tituloSecao}>Perfil</h2>
        <TextField rotulo="Nome" value={nome} onChange={setNome} autoComplete="name" erro={tentou ? nomeErro : undefined} />
        <TextField
          rotulo="Especialidade"
          value={especialidade}
          onChange={setEspecialidade}
          descricao="Opcional."
          erro={tentou ? especialidadeErro : undefined}
        />
        <TextField rotulo="E-mail" value={psicologo.email} isReadOnly descricao="Não pode ser alterado aqui." />
        <TextField rotulo="CRP" value={psicologo.crp} isReadOnly descricao="Não pode ser alterado aqui." />
        {salvar.isError && <AvisoErro>{mensagemDeErro(salvar.error, 'Não foi possível salvar o perfil.')}</AvisoErro>}
        <div>
          <Button type="submit" isPending={salvar.isPending}>
            Salvar perfil
          </Button>
        </div>
      </form>
    </Card>
  );
}

function TrocaSenha() {
  const cliente = useQueryClient();
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [tentou, setTentou] = useState(false);
  const [trocada, setTrocada] = useState(false);

  const erros = {
    atual: atual ? undefined : 'Informe a senha atual.',
    nova: nova.length >= SENHA_MIN && nova.length <= SENHA_MAX ? undefined : `A nova senha precisa ter de ${SENHA_MIN} a ${SENHA_MAX} caracteres.`,
    confirmacao: confirmacao === nova ? undefined : 'A confirmação é diferente da nova senha.',
  };

  const trocar = useMutation({
    mutationFn: () => trocarSenha(atual, nova),
    onSuccess: async () => {
      setAtual('');
      setNova('');
      setConfirmacao('');
      setTentou(false);
      setTrocada(true);
      notificar({ titulo: 'Senha alterada' });
      await cliente.invalidateQueries({ queryKey: ['sessoes'] });
    },
  });

  // O servidor responde 400 para a senha atual incorreta (401 faria o front renovar a sessão).
  const senhaAtualIncorreta = trocar.isError && isAxiosError(trocar.error) && trocar.error.response?.status === 400;

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setTentou(true);
    setTrocada(false);
    if (!erros.atual && !erros.nova && !erros.confirmacao) trocar.mutate();
  }

  return (
    <Card>
      <form onSubmit={enviar} noValidate className={css.formulario}>
        <h2 className={pagina.tituloSecao}>Trocar senha</h2>
        <PasswordField
          rotulo="Senha atual"
          value={atual}
          onChange={(valor) => {
            setAtual(valor);
            trocar.reset();
          }}
          autoComplete="current-password"
          erro={tentou && erros.atual ? erros.atual : senhaAtualIncorreta ? mensagemDeErro(trocar.error) : undefined}
        />
        <PasswordField
          rotulo="Nova senha"
          value={nova}
          onChange={setNova}
          autoComplete="new-password"
          descricao={`De ${SENHA_MIN} a ${SENHA_MAX} caracteres.`}
          erro={tentou ? erros.nova : undefined}
        />
        <PasswordField
          rotulo="Confirmar a nova senha"
          value={confirmacao}
          onChange={setConfirmacao}
          autoComplete="new-password"
          erro={tentou ? erros.confirmacao : undefined}
        />
        {trocar.isError && !senhaAtualIncorreta && <AvisoErro>{mensagemDeErro(trocar.error, 'Não foi possível trocar a senha.')}</AvisoErro>}
        {trocada && (
          <p role="status" className={css.aviso}>
            <Info aria-hidden />
            Senha alterada. As outras sessões foram encerradas: só esta continua aberta.
          </p>
        )}
        <div>
          <Button type="submit" isPending={trocar.isPending}>
            Trocar senha
          </Button>
        </div>
      </form>
    </Card>
  );
}

// Resumo legível do user-agent: navegador e sistema, sem o texto bruto.
function resumirDispositivo(userAgent: string | null) {
  if (!userAgent) return 'Dispositivo desconhecido';
  const navegador = /Edg\//.test(userAgent)
    ? 'Edge'
    : /OPR\//.test(userAgent)
      ? 'Opera'
      : /Firefox\//.test(userAgent)
        ? 'Firefox'
        : /Chrome\//.test(userAgent)
          ? 'Chrome'
          : /Safari\//.test(userAgent)
            ? 'Safari'
            : 'Navegador';
  const sistema = /Android/.test(userAgent)
    ? 'Android'
    : /iPhone|iPad/.test(userAgent)
      ? 'iOS'
      : /Windows/.test(userAgent)
        ? 'Windows'
        : /Mac OS X/.test(userAgent)
          ? 'macOS'
          : /CrOS/.test(userAgent)
            ? 'ChromeOS'
            : /Linux/.test(userAgent)
              ? 'Linux'
              : null;
  return sistema ? `${navegador} em ${sistema}` : navegador;
}

function Sessoes() {
  const cliente = useQueryClient();
  const [confirmando, setConfirmando] = useState(false);
  const sessoes = useQuery({ queryKey: ['sessoes'], queryFn: listarSessoes });

  const encerrar = useMutation({
    mutationFn: encerrarOutrasSessoes,
    onSuccess: async (quantidade) => {
      setConfirmando(false);
      notificar({ titulo: quantidade === 0 ? 'Nenhuma outra sessão estava aberta' : `${plural(quantidade, 'sessão encerrada', 'sessões encerradas')}` });
      await cliente.invalidateQueries({ queryKey: ['sessoes'] });
    },
    onError: (erro) => {
      setConfirmando(false);
      notificar({ titulo: 'Não foi possível encerrar as sessões', descricao: mensagemDeErro(erro), tipo: 'erro' });
    },
  });

  const outras = (sessoes.data ?? []).filter((s) => !s.atual).length;

  return (
    <Card>
      <div className={pagina.secao}>
        <div className={pagina.cabecalho}>
          <div>
            <h2 className={pagina.tituloSecao}>Sessões ativas</h2>
            <p className={pagina.subtituloSecao}>Dispositivos com acesso à sua conta agora.</p>
          </div>
          <Button variante="outlined" isDisabled={outras === 0} onPress={() => setConfirmando(true)}>
            Encerrar outras sessões
          </Button>
        </div>
        {sessoes.isPending ? (
          <div role="status" className={pagina.esqueleto}>
            <VisuallyHidden>Carregando as sessões</VisuallyHidden>
            <Skeleton />
            <Skeleton />
          </div>
        ) : sessoes.isError ? (
          <EstadoErro erro={sessoes.error} onTentar={() => void sessoes.refetch()} titulo="Não foi possível carregar as sessões" />
        ) : (
          <ul>
            {sessoes.data.map((s) => (
              <ListItem
                key={s.id}
                titulo={resumirDispositivo(s.userAgent)}
                apoio={`IP ${s.ip ?? 'desconhecido'} · último uso em ${formatarDataHora(s.ultimoUsoEm)}`}
                fim={s.atual ? <Chip>Esta sessão</Chip> : undefined}
              />
            ))}
          </ul>
        )}
      </div>
      <Dialog
        titulo="Encerrar as outras sessões?"
        isOpen={confirmando}
        onOpenChange={setConfirmando}
        acoes={
          <>
            <Button variante="text" onPress={() => setConfirmando(false)}>
              Cancelar
            </Button>
            <Button isPending={encerrar.isPending} onPress={() => encerrar.mutate()}>
              Encerrar sessões
            </Button>
          </>
        }
      >
        {`${plural(outras, 'outro dispositivo perde', 'outros dispositivos perdem')} o acesso agora e precisa entrar de novo. Esta sessão continua aberta.`}
      </Dialog>
    </Card>
  );
}

function Preferencias() {
  return (
    <Card>
      <div className={css.formulario}>
        <h2 className={pagina.tituloSecao}>Preferências</h2>
        <div className={pagina.secao}>
          <h3 className={css.subtitulo}>Tema</h3>
          <SeletorTema />
        </div>
      </div>
    </Card>
  );
}

// Só quem nunca teve vínculo exclui (o servidor confere e responde 409): o registro clínico fica guardado.
function ExcluirConta() {
  const cliente = useQueryClient();
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [senha, setSenha] = useState('');

  const excluir = useMutation({
    mutationFn: () => excluirConta(senha),
    onSuccess: () => {
      cliente.clear();
      navigate('/', { replace: true });
      notificar({ titulo: 'Conta excluída' });
    },
  });

  function fechar() {
    setAberto(false);
    setSenha('');
    excluir.reset();
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (senha) excluir.mutate();
  }

  return (
    <Card>
      <div className={css.formulario}>
        <h2 className={pagina.tituloSecao}>Excluir conta</h2>
        <p className={pagina.subtituloSecao}>
          Para quem criou a conta de psicólogo por engano. Só é possível enquanto a conta nunca teve pacientes vinculados: depois
          disso, os registros clínicos precisam ser guardados.
        </p>
        <div>
          <Button variante="outlined" onPress={() => setAberto(true)}>
            Excluir conta
          </Button>
        </div>
      </div>
      <Dialog
        titulo="Excluir a conta?"
        isOpen={aberto}
        onOpenChange={(abrir) => (abrir ? setAberto(true) : fechar())}
        acoes={
          <>
            <Button variante="text" onPress={fechar}>
              Cancelar
            </Button>
            <Button type="submit" form="form-excluir-conta" isDisabled={!senha} isPending={excluir.isPending}>
              Excluir
            </Button>
          </>
        }
      >
        <form id="form-excluir-conta" onSubmit={enviar} noValidate className={css.formulario}>
          <p>A conta, o perfil e os códigos de vínculo são apagados. Isso não pode ser desfeito.</p>
          <PasswordField
            rotulo="Sua senha"
            value={senha}
            onChange={(valor) => {
              setSenha(valor);
              excluir.reset();
            }}
            autoComplete="current-password"
          />
          {excluir.isError && <AvisoErro>{mensagemDeErro(excluir.error, 'Não foi possível excluir a conta.')}</AvisoErro>}
        </form>
      </Dialog>
    </Card>
  );
}

export default function MinhaArea() {
  const sair = useSair();
  const [params, setParams] = useSearchParams();
  const abaParam = params.get('aba');
  const aba = ABAS.find((a) => a === abaParam) ?? ABAS[0];
  const me = useQuery({ queryKey: CHAVE_ME, queryFn: buscarMe });

  return (
    <section className={pagina.tela} aria-labelledby="titulo-tela">
      <header className={pagina.cabecalho}>
        <h1 id="titulo-tela" className={pagina.titulo}>
          Minha área
        </h1>
        <Button variante="outlined" icone={<LogOut />} onPress={() => void sair()}>
          Sair
        </Button>
      </header>
      <Tabs
        aria-label="Seções da minha área"
        selectedKey={aba}
        onSelectionChange={(chave) => setParams({ aba: String(chave) }, { replace: true })}
        abas={[
          {
            id: 'perfil',
            rotulo: 'Perfil',
            painel: me.data ? (
              <div className={css.pilha}>
                <PerfilConta key={me.data.id} psicologo={me.data} />
                <ExcluirConta />
              </div>
            ) : me.isError ? (
              <EstadoErro erro={me.error} onTentar={() => void me.refetch()} titulo="Não foi possível carregar o perfil" />
            ) : (
              <Skeleton forma="bloco" />
            ),
          },
          { id: 'senha', rotulo: 'Senha', painel: <TrocaSenha /> },
          { id: 'sessoes', rotulo: 'Sessões', painel: <Sessoes /> },
          { id: 'preferencias', rotulo: 'Preferências', painel: <Preferencias /> },
        ]}
      />
    </section>
  );
}
