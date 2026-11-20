import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import {
  api,
  novaVersaoSessao,
  registrarAoSessaoExpirar,
  respostaDeSessaoAntiga,
} from '../lib/api';
import { erroEmail } from '../lib/email';
import { resetarRascunho } from '../lib/rascunhoCheckin';
import { limparContatos } from '../lib/contatosConfianca';
import { guardarDispositivo, lerDispositivo } from '../lib/dispositivoConfiavel';
import { salvarTokenSeguro,obterTokenSeguro,removerTokenSeguro,tokenEmMemoria,} from '../lib/authToken';

export type UsuarioAutenticado = {
  id: number;
  nome: string;
  email: string;
  data_nascimento: string | null;
};

let usuarioCompartilhado: UsuarioAutenticado | null = null;
let carregandoUsuarioCompartilhado = false;
let sessaoInicializada = false;
let restaurando = false;

type EstadoSessao = 'lendo' | 'ativa' | 'ausente';

// Deriva do espelho do token: undefined = ainda não lido, null = sem token, texto = sessão.
const lerSessao = (): EstadoSessao => {
  const token = tokenEmMemoria();
  return token === undefined ? 'lendo' : token ? 'ativa' : 'ausente';
};

const ouvintesSessao = new Set<() => void>();

const notificarSessao = () => {
  ouvintesSessao.forEach((ouvinte) => ouvinte());
};

const atualizarUsuarioCompartilhado = (usuario: UsuarioAutenticado | null) => {
  usuarioCompartilhado = usuario;
  notificarSessao();
};

const atualizarCarregandoUsuario = (carregando: boolean) => {
  carregandoUsuarioCompartilhado = carregando;
  notificarSessao();
};

const tokenInvalidoOuExpirado = (error: any) => {
  const status = error?.response?.status;
  return status === 401 || status === 403;
};

/** DD/MM/YYYY → YYYY-MM-DD (formato que o PostgreSQL aceita) */
function dataParaISO(dataBR: string): string | null {
  const [dia, mes, ano] = dataBR.split('/').map(Number);
  if (!dia || !mes || !ano || String(ano).length !== 4) return null;

  const d = new Date(ano, mes - 1, dia);
  if (d.getFullYear() !== ano || d.getMonth() !== mes - 1 || d.getDate() !== dia) {
    return null;
  }

  const mm = String(mes).padStart(2, '0');
  const dd = String(dia).padStart(2, '0');
  return `${ano}-${mm}-${dd}`;
}

// O token já está no storage (o interceptor lê de lá).
const buscarUsuarioSalvo = async (): Promise<UsuarioAutenticado> => {
  atualizarCarregandoUsuario(true);

  try {
    const response = await api.get<UsuarioAutenticado>('/auth/me');
    // Se o token mudou no meio da chamada (novo login), esse perfil é da conta anterior.
    if (!respostaDeSessaoAntiga(response.config)) atualizarUsuarioCompartilhado(response.data);
    return response.data;
  } finally {
    atualizarCarregandoUsuario(false);
  }
};

const restaurarSessaoSalva = async (): Promise<UsuarioAutenticado | null> => {
  // Uma restauração por vez: a Home monta assim que a sessão vira 'ativa', com o /auth/me ainda em voo.
  if (sessaoInicializada || restaurando) {
    return usuarioCompartilhado;
  }

  restaurando = true;
  try {
    const token = await obterTokenSeguro();
    // O espelho acabou de sair de undefined: avisa para a sessão sair de 'lendo'.
    notificarSessao();

    if (!token) {
      atualizarUsuarioCompartilhado(null);
      sessaoInicializada = true;
      return null;
    }

    const usuario = await buscarUsuarioSalvo();
    sessaoInicializada = true;
    return usuario;
  } catch (error: any) {
    if (tokenInvalidoOuExpirado(error)) {
      if (!respostaDeSessaoAntiga(error.config)) await limparSessao();
      sessaoInicializada = true;
      return null;
    }

    // Rede ou servidor fora: a sessão segue ativa e o /auth/me é tentado de novo na próxima montagem.
    console.warn('Erro ao restaurar sessão:', error?.message);
    return null;
  } finally {
    restaurando = false;
  }
};

const limparSessao = async () => {
  // Avança antes de apagar: resposta que saiu antes da limpeza não traz o perfil de volta.
  novaVersaoSessao();
  try {
    await removerTokenSeguro();
  } catch (erro: any) {
    // Mesmo que apagar do armazenamento falhe, o app precisa sair da sessão.
    console.warn('Falha ao apagar o token:', erro?.message);
  }
  // Sessão que expira também não deixa o rascunho (texto do diário) para o próximo usuário do aparelho.
  resetarRascunho();
  usuarioCompartilhado = null;
  carregandoUsuarioCompartilhado = false;
  sessaoInicializada = true;
  notificarSessao();
};
registrarAoSessaoExpirar(limparSessao);

export function useAuth() {
  const [carregando, setCarregando] = useState(false);
  const [usuario, setUsuarioLocal] = useState<UsuarioAutenticado | null>(usuarioCompartilhado);
  const [carregandoUsuario, setCarregandoUsuarioLocal] = useState(carregandoUsuarioCompartilhado);
  const [sessao, setSessaoLocal] = useState(lerSessao);

  useEffect(() => {
    const sincronizarEstado = () => {
      setUsuarioLocal(usuarioCompartilhado);
      setCarregandoUsuarioLocal(carregandoUsuarioCompartilhado);
      setSessaoLocal(lerSessao());
    };

    ouvintesSessao.add(sincronizarEstado);
    sincronizarEstado();
    void restaurarSessaoSalva();

    return () => {
      ouvintesSessao.delete(sincronizarEstado);
    };
  }, []);

  const buscarUsuario = async (): Promise<UsuarioAutenticado | null> => {
    const token = await obterTokenSeguro();
    if (!token) {
      atualizarUsuarioCompartilhado(null);
      return null;
    }

    try {
      const usuarioAtual = await buscarUsuarioSalvo();
      sessaoInicializada = true;
      return usuarioAtual;
    } catch (error: any) {
      if (tokenInvalidoOuExpirado(error) && !respostaDeSessaoAntiga(error.config)) {
        await limparSessao();
      }
      throw error;
    }
  };

  // Token salvo e perfil já em mãos: a sessão começa sem o GET /auth/me.
  const abrirSessaoApp = async (token: string, usuarioNovo: UsuarioAutenticado) => {
    novaVersaoSessao();
    await salvarTokenSeguro(token);
    atualizarUsuarioCompartilhado(usuarioNovo);
    sessaoInicializada = true;
  };

  const login = async (
    email: string,
    senha: string,
    onEmailNaoVerificado?: () => void,
    onCodigo?: (desafio: { desafioId: string; emailMascarado: string }) => void,
  ) => {
    if (!email.trim()) {
      Alert.alert('Campo faltando', 'Digite seu e-mail para continuar.');
      return;
    }
    if (!senha.trim()) {
      Alert.alert('Campo faltando', 'Digite sua senha para continuar.');
      return;
    }

    setCarregando(true);

    try {
      atualizarUsuarioCompartilhado(null);

      const dispositivo = await lerDispositivo();
      const response = await api.post(
        '/auth/login',
        { email: email.trim(), password: senha },
        { headers: dispositivo ? { 'x-dispositivo': dispositivo } : undefined },
      );

      // Sem celular confiável, a API manda o código por e-mail (2FA) e a tela do código conclui.
      if (response.data.desafioId) {
        onCodigo?.(response.data);
        return;
      }
      await abrirSessaoApp(response.data.token, response.data.usuario);
    } catch (error: any) {
      if (
        error.response?.status === 403 &&
        error.response?.data?.codigo === 'EMAIL_NAO_VERIFICADO'
      ) {
        onEmailNaoVerificado?.();
        return;
      }

      if (tokenInvalidoOuExpirado(error)) {
        await limparSessao();
      }

      const mensagemErro =
        error.response?.data?.error ||
        'Não foi possível conectar ao servidor. Verifique sua internet e tente de novo.';

      Alert.alert('Não foi possível entrar', mensagemErro);
    } finally {
      setCarregando(false);
    }
  };

  const registro = async (
    nome: string,
    email: string,
    senha: string,
    confirmarSenha: string,
    dataNascimento: string,
    aceito: boolean,
    onSuccess: () => void,
  ) => {
    if (!nome.trim()) {
      Alert.alert('Campo faltando', 'Digite seu nome completo para criar sua conta.');
      return;
    }

    const erroEmailMsg = erroEmail(email);
    if (erroEmailMsg) {
      Alert.alert('E-mail inválido', erroEmailMsg);
      return;
    }

    if (!senha.trim() || senha.length < 8) {
      Alert.alert('Senha curta demais', 'Use pelo menos 8 caracteres para proteger sua conta.');
      return;
    }

    if (senha !== confirmarSenha) {
      Alert.alert('Senhas diferentes', 'As duas senhas digitadas não coincidem. Revise e digite novamente.');
      return;
    }

    if (!dataNascimento.trim()) {
      Alert.alert('Campo faltando', 'Informe sua data de nascimento para continuar.');
      return;
    }

    const dataISO = dataParaISO(dataNascimento);
    if (!dataISO) {
      Alert.alert('Data inválida', 'Confira o dia, o mês e o ano da sua data de nascimento.');
      return;
    }

    if (!aceito) {
      Alert.alert(
        'Falta confirmar',
        'Para criar sua conta, leia e aceite os Termos de Uso e a Política de Privacidade.',
      );
      return;
    }

    setCarregando(true);

    try {
      // NÃO salva token no cadastro — conta ainda precisa verificar e-mail
      await api.post('/auth/registro', {
        nome: nome.trim(),
        email: email.trim(),
        password: senha,
        dataNascimento: dataISO, // YYYY-MM-DD
      });

      onSuccess();
    } catch (error: any) {
      const mensagemErro =
        error.response?.data?.error ||
        'Não foi possível conectar ao servidor. Tente novamente mais tarde.';

      Alert.alert('Não foi possível criar a conta', mensagemErro);
    } finally {
      setCarregando(false);
    }
  };

  const confirmarEmail = async (email: string, codigo: string): Promise<boolean> => {
    if (codigo.length < 6) {
      Alert.alert('Código incompleto', 'Digite os 6 dígitos que enviamos para o seu e-mail.');
      return false;
    }

    try {
      await api.post('/auth/verificar-email', {
        email: email.trim(),
        codigo: Number(codigo),
      });
      return true;
    } catch (error: any) {
      Alert.alert(
        'Código não verificado',
        error.response?.data?.error || 'Confira os dígitos e tente novamente.',
      );
      return false;
    }
  };

  // Login, etapa 2. 'expirado': o desafio acabou e é preciso entrar de novo.
  const confirmarLogin = async (
    desafioId: string,
    codigo: string,
    confiar: boolean,
  ): Promise<'ok' | 'erro' | 'expirado'> => {
    try {
      const { data } = await api.post('/auth/2fa', { desafioId, codigo, confiar });
      if (data.dispositivo) await guardarDispositivo(data.dispositivo);
      await abrirSessaoApp(data.token, data.usuario);
      return 'ok';
    } catch (error: any) {
      const mensagem: string = error.response?.data?.error || 'Confira os dígitos e tente novamente.';
      Alert.alert('Código não verificado', mensagem);
      return mensagem.startsWith('Código inválido ou expirado') ? 'expirado' : 'erro';
    }
  };

  const reenviarCodigoLogin = async (desafioId: string): Promise<'ok' | 'erro' | 'expirado'> => {
    try {
      await api.post('/auth/2fa/reenviar', { desafioId });
      Alert.alert('Verifique seu e-mail', 'Enviamos um novo código.');
      return 'ok';
    } catch (error: any) {
      Alert.alert('Não foi possível reenviar', error.response?.data?.error || 'Tente novamente em instantes.');
      return error.response?.data?.codigo === 'DESAFIO_EXPIRADO' ? 'expirado' : 'erro';
    }
  };

  const reenviarCodigo = async (email: string): Promise<boolean> => {
    try {
      await api.post('/auth/reenviar-codigo', { email: email.trim() });
      Alert.alert(
        'Verifique seu e-mail',
        'Se houver uma conta pendente, você receberá um novo código em instantes.',
      );
      return true;
    } catch (error: any) {
      Alert.alert(
        'Não foi possível reenviar',
        error.response?.data?.error || 'Tente novamente em instantes.',
      );
      return false;
    }
  };

  const solicitarRedefinicao = async (email: string): Promise<boolean> => {
    try {
      await api.post('/auth/esqueci-senha', { email: email.trim() });
      return true;
    } catch (error: any) {
      Alert.alert(
        'Não foi possível enviar o código',
        error.response?.data?.error || 'Tente novamente em instantes.',
      );
      return false;
    }
  };

  // Retorna token TEMPORÁRIO — NÃO salvar no SecureStore
  const confirmarCodigoRedefinicao = async (
    email: string,
    codigo: string,
  ): Promise<string | null> => {
    if (codigo.length < 6) {
      Alert.alert('Código incompleto', 'Digite os 6 dígitos que enviamos para o seu e-mail.');
      return null;
    }

    try {
      const response = await api.post('/auth/verificar-codigo-senha', {
        email: email.trim(),
        codigo: Number(codigo),
      });
      return response.data.token as string;
    } catch (error: any) {
      Alert.alert(
        'Código não confirmado',
        error.response?.data?.error || 'Confira os dígitos ou peça um novo código.',
      );
      return null;
    }
  };

  const redefinirSenha = async (token: string, senha: string): Promise<boolean> => {
    try {
      await api.post('/auth/redefinir-senha', { token, password: senha });
      // Garante que nenhum token antigo de acesso continue válido no aparelho (pela limpeza única,
      // que também avança a versão da sessão).
      await limparSessao();
      return true;
    } catch (error: any) {
      Alert.alert(
        'Não foi possível trocar a senha',
        error.response?.data?.error ||
          'O pedido pode ter expirado — comece novamente pelo e-mail.',
      );
      return false;
    }
  };

  const logout = async () => {
    try {
      const token = await obterTokenSeguro();
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (error: any) {
      console.warn('Não foi possível notificar o servidor do logout:', error?.message);
    }

    // Só no "Sair" explícito: a sessão que expira sozinha não apaga os contatos de crise do paciente.
    await limparContatos();
    await limparSessao();
  };

  // Troca de senha devolve um token novo: a sessão segue neste celular com ele.
  const renovarSessao = (token: string, usuarioNovo: UsuarioAutenticado) => abrirSessaoApp(token, usuarioNovo);
  const renomear = (nome: string) => usuarioCompartilhado && atualizarUsuarioCompartilhado({ ...usuarioCompartilhado, nome });

  return {
    renovarSessao,
    renomear,
    login,
    registro,
    confirmarEmail,
    confirmarLogin,
    reenviarCodigo,
    reenviarCodigoLogin,
    solicitarRedefinicao,
    confirmarCodigoRedefinicao,
    redefinirSenha,
    logout,
    buscarUsuario,
    carregando,
    carregandoUsuario,
    usuario,
    sessao,
  };
}