import { useState } from 'react';
import { isAxiosError } from 'axios';
import { useForm } from 'react-hook-form';
import { ArrowLeft, CircleAlert } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { notificar } from '../../components/ui/Toast';
import { ESPERA_REENVIO_MS, esqueciSenha, redefinirSenha, verificarCodigoSenha } from '../../lib/authApi';
import { mensagemDeErro } from '../../lib/erros';
import { CampoForm } from './CampoForm';
import { esquemaEmail, esquemaNovaSenha, resolverZod, VALORES_VAZIOS, type Valores } from './validacao';
import { VerificacaoCodigo } from './VerificacaoCodigo';
import css from './Formulario.module.css';

const resolverEmail = resolverZod<Valores>(esquemaEmail);
const resolverNovaSenha = resolverZod<Valores>(esquemaNovaSenha);

type Props = { email: string; aoVoltar: (email: string) => void };

export function RecuperarSenha({ email, aoVoltar }: Props) {
  const [token, setToken] = useState<string>();
  const [mensagem, setMensagem] = useState<string>();
  const [aberta, setAberta] = useState(false);
  const [liberaEm, setLiberaEm] = useState(0);
  // O e-mail como foi enviado (já normalizado), para o diálogo e as chamadas seguintes.
  const [emailEnviado, setEmailEnviado] = useState('');
  const novaSenha = token !== undefined;

  const { control, handleSubmit, getValues, formState } = useForm<Valores>({
    defaultValues: { ...VALORES_VAZIOS, email },
    resolver: novaSenha ? resolverNovaSenha : resolverEmail,
  });

  const aoEnviar = handleSubmit(async ({ email, password }) => {
    setMensagem(undefined);
    try {
      if (token === undefined) {
        // A resposta é sempre a mesma, exista a conta ou não.
        await esqueciSenha(email);
        setEmailEnviado(email);
        setLiberaEm(Date.now() + ESPERA_REENVIO_MS);
        setAberta(true);
        return;
      }
      await redefinirSenha(token, password);
      notificar({ titulo: 'Senha redefinida', descricao: 'Entre com a nova senha.' });
      aoVoltar(email);
    } catch (falha) {
      // 400 aqui significa token vencido ou conta inexistente: só um novo código resolve.
      if (token !== undefined && isAxiosError(falha) && falha.response?.status === 400) setToken(undefined);
      setMensagem(mensagemDeErro(falha));
    }
  });

  return (
    <>
      <Button variante="text" icone={<ArrowLeft />} onPress={() => aoVoltar(getValues('email'))}>
        Voltar ao login
      </Button>
      <form noValidate onSubmit={aoEnviar} aria-labelledby="titulo-recuperar" className={css.formulario}>
        <div className={css.cabecalho}>
          <h2 id="titulo-recuperar" className={css.titulo}>
            {novaSenha ? 'Escolha a nova senha' : 'Recuperar senha'}
          </h2>
          <p className={css.texto}>
            {novaSenha
              ? 'Código confirmado. Use de 8 a 72 caracteres.'
              : 'Informe o e-mail da sua conta. Se ele estiver cadastrado, enviaremos um código de 6 dígitos.'}
          </p>
        </div>
        {novaSenha ? (
          <>
            <div className={css.bloco}>
              <CampoForm senha medidor autoFocus control={control} nome="password" rotulo="Nova senha" autoComplete="new-password" />
            </div>
            <div className={css.bloco}>
              <CampoForm senha control={control} nome="confirmacao" rotulo="Confirmar nova senha" autoComplete="new-password" />
            </div>
          </>
        ) : (
          <div className={css.bloco}>
            <CampoForm autoFocus control={control} nome="email" rotulo="E-mail" type="email" inputMode="email" autoComplete="email" />
          </div>
        )}
        {mensagem && (
          <p role="alert" className={css.erro}>
            <CircleAlert aria-hidden />
            {mensagem}
          </p>
        )}
        <Button type="submit" isPending={formState.isSubmitting}>
          {novaSenha ? 'Redefinir senha' : 'Enviar código'}
        </Button>
      </form>

      <VerificacaoCodigo
        isOpen={aberta}
        onOpenChange={setAberta}
        titulo="Código de recuperação"
        instrucao="Se houver uma conta ativa com este e-mail, enviamos um código de 6 dígitos."
        email={emailEnviado}
        reenviarEm={liberaEm}
        onConfirmar={async (codigo) => {
          setToken(await verificarCodigoSenha(emailEnviado, codigo));
          setAberta(false);
        }}
        onReenviar={async () => {
          await esqueciSenha(emailEnviado);
          return Date.now() + ESPERA_REENVIO_MS;
        }}
      />
    </>
  );
}
