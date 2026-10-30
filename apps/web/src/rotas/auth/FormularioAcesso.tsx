import { useState } from 'react';
import { useNavigate } from 'react-router';
import { isAxiosError } from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { CircleAlert } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Colapsavel } from '../../components/ui/Colapsavel';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { notificar } from '../../components/ui/Toast';
import {
  cadastrar,
  confirmarDoisFatores,
  entrar,
  ESPERA_REENVIO_MS,
  MSG_CODIGO_ENCERRADO,
  reenviarCodigoEmail,
  reenviarDoisFatores,
  verificarEmail,
} from '../../lib/authApi';
import { codigoDeErro, mensagemDeErro } from '../../lib/erros';
import { CampoForm } from './CampoForm';
import { esquemaCadastro, esquemaLogin, mascararData, resolverZod, VALORES_VAZIOS, type Valores } from './validacao';
import { VerificacaoCodigo } from './VerificacaoCodigo';
import css from './Formulario.module.css';

type Modo = 'login' | 'cadastro';

const OPCOES = [
  { id: 'login', rotulo: 'Login' },
  { id: 'cadastro', rotulo: 'Cadastro' },
] as const;

const resolverLogin = resolverZod<Valores>(esquemaLogin);
const resolverCadastro = resolverZod<Valores>(esquemaCadastro);

type Verificacao =
  | { tipo: 'doisFatores'; desafioId: string; emailMascarado: string; reenviarEm: number }
  | { tipo: 'email'; email: string; reenviarEm: number };

type Props = { email: string; aoRecuperarSenha: (email: string) => void };

export function FormularioAcesso({ email, aoRecuperarSenha }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modo, setModo] = useState<Modo>('login');
  const [mensagem, setMensagem] = useState<string>();
  // A verificação é mantida depois de fechar para o diálogo terminar a animação de saída com o conteúdo.
  const [verificacao, setVerificacao] = useState<Verificacao>();
  const [aberta, setAberta] = useState(false);
  const cadastro = modo === 'cadastro';

  const { control, handleSubmit, getValues, clearErrors, formState } = useForm<Valores>({
    defaultValues: { ...VALORES_VAZIOS, email },
    resolver: cadastro ? resolverCadastro : resolverLogin,
  });

  const abrir = (v: Verificacao) => {
    setVerificacao(v);
    setAberta(true);
  };

  async function iniciarLogin({ email, password }: Valores) {
    try {
      const desafio = await entrar(email, password);
      abrir({
        tipo: 'doisFatores',
        desafioId: desafio.desafioId,
        emailMascarado: desafio.emailMascarado,
        reenviarEm: new Date(desafio.reenviarEm).getTime(),
      });
    } catch (falha) {
      if (codigoDeErro(falha) !== 'EMAIL_NAO_VERIFICADO') throw falha;
      // 429: um código acabou de ser enviado (cadastro recente), então basta abrir a verificação.
      await reenviarCodigoEmail(email).catch((erro: unknown) => {
        if (!isAxiosError(erro) || erro.response?.status !== 429) throw erro;
      });
      abrir({ tipo: 'email', email, reenviarEm: Date.now() + ESPERA_REENVIO_MS });
    }
  }

  async function criarConta({ nome, email, password, dataNascimento, crp, especialidade }: Valores) {
    await cadastrar({ nome, email, password, dataNascimento, crp, especialidade: especialidade || undefined });
    abrir({ tipo: 'email', email, reenviarEm: Date.now() + ESPERA_REENVIO_MS });
  }

  const aoEnviar = handleSubmit(async (valores) => {
    setMensagem(undefined);
    try {
      await (cadastro ? criarConta(valores) : iniciarLogin(valores));
    } catch (falha) {
      setMensagem(mensagemDeErro(falha));
    }
  });

  async function confirmarDesafio(desafioId: string, codigo: string) {
    try {
      await confirmarDoisFatores(desafioId, codigo);
    } catch (falha) {
      // O desafio acabou: não adianta digitar de novo, é preciso entrar outra vez.
      if (isAxiosError(falha) && mensagemDeErro(falha) === MSG_CODIGO_ENCERRADO) {
        setAberta(false);
        setMensagem(MSG_CODIGO_ENCERRADO);
        return;
      }
      throw falha;
    }
    await queryClient.invalidateQueries({ queryKey: ['psicologo', 'me'] });
    navigate('/inicio');
  }

  async function reenviarDesafio(desafioId: string) {
    try {
      return await reenviarDoisFatores(desafioId);
    } catch (falha) {
      // Desafio expirado: reenviar não adianta, volta ao login como na confirmação.
      if (codigoDeErro(falha) === 'DESAFIO_EXPIRADO') {
        setAberta(false);
        setMensagem(mensagemDeErro(falha));
      }
      throw falha;
    }
  }

  async function confirmarEmail(emailVerificado: string, codigo: string) {
    await verificarEmail(emailVerificado, codigo);
    setAberta(false);
    setModo('login');
    clearErrors();
    notificar({ titulo: 'E-mail confirmado', descricao: 'Agora é só entrar com seu e-mail e senha.' });
  }

  return (
    <>
      <form noValidate onSubmit={aoEnviar} aria-label={cadastro ? 'Criar conta' : 'Entrar'} className={css.formulario}>
        <div className={css.bloco}>
          <SegmentedControl
            aria-label="Tipo de acesso"
            opcoes={OPCOES}
            valor={modo}
            onChange={(id) => {
              setModo(id === 'cadastro' ? 'cadastro' : 'login');
              setMensagem(undefined);
              clearErrors();
            }}
          />
        </div>
        <Colapsavel aberto={cadastro}>
          <CampoForm control={control} nome="nome" rotulo="Nome completo" autoComplete="name" />
        </Colapsavel>
        <div className={css.bloco}>
          <CampoForm control={control} nome="email" rotulo="E-mail" type="email" inputMode="email" autoComplete="email" />
        </div>
        <Colapsavel aberto={cadastro}>
          <div className={css.duplo}>
            <CampoForm
              control={control}
              nome="dataNascimento"
              rotulo="Data de nascimento"
              descricao="DD/MM/AAAA"
              inputMode="numeric"
              autoComplete="bday"
              formatar={mascararData}
            />
            <CampoForm control={control} nome="crp" rotulo="CRP" descricao="00/000000" autoComplete="off" />
          </div>
          <CampoForm control={control} nome="especialidade" rotulo="Especialidade (opcional)" autoComplete="off" />
        </Colapsavel>
        <div className={css.bloco}>
          <CampoForm
            senha
            control={control}
            nome="password"
            rotulo="Senha"
            autoComplete={cadastro ? 'new-password' : 'current-password'}
          />
        </div>
        <Colapsavel aberto={cadastro}>
          <CampoForm senha control={control} nome="confirmacao" rotulo="Confirmar senha" autoComplete="new-password" />
        </Colapsavel>
        <Colapsavel aberto={!cadastro}>
          <div className={css.esqueci}>
            <Button variante="text" onPress={() => aoRecuperarSenha(getValues('email'))}>
              Esqueci a senha
            </Button>
          </div>
        </Colapsavel>
        {mensagem && (
          <p role="alert" className={css.erro}>
            <CircleAlert aria-hidden />
            {mensagem}
          </p>
        )}
        <Button type="submit" isPending={formState.isSubmitting}>
          {cadastro ? 'Criar conta' : 'Entrar'}
        </Button>
      </form>

      {verificacao?.tipo === 'doisFatores' && (
        <VerificacaoCodigo
          isOpen={aberta}
          onOpenChange={setAberta}
          titulo="Verificação em 2 etapas"
          instrucao="Digite o código de 6 dígitos que enviamos por e-mail."
          email={verificacao.emailMascarado}
          reenviarEm={verificacao.reenviarEm}
          onConfirmar={(codigo) => confirmarDesafio(verificacao.desafioId, codigo)}
          onReenviar={() => reenviarDesafio(verificacao.desafioId)}
        />
      )}
      {verificacao?.tipo === 'email' && (
        <VerificacaoCodigo
          isOpen={aberta}
          onOpenChange={setAberta}
          titulo="Confirme seu e-mail"
          instrucao="Digite o código de 6 dígitos que enviamos para confirmar sua conta."
          email={verificacao.email}
          reenviarEm={verificacao.reenviarEm}
          onConfirmar={(codigo) => confirmarEmail(verificacao.email, codigo)}
          onReenviar={async () => {
            await reenviarCodigoEmail(verificacao.email);
            return Date.now() + ESPERA_REENVIO_MS;
          }}
        />
      )}
    </>
  );
}
