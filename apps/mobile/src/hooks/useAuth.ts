import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { api } from '../lib/api';
import { erroEmail } from '../lib/email';
import { resetarRascunho } from '../lib/rascunhoCheckin';
import { salvarTokenSeguro,obterTokenSeguro,removerTokenSeguro,} from '../lib/authToken';
let avisoFalhaRestauracaoEmitido = false;

export type UsuarioAutenticado = {
  id: number;
  nome: string;
  email: string;
  data_nascimento: string | null;
};

let usuarioCompartilhado: UsuarioAutenticado | null = null;
let carregandoUsuarioCompartilhado = false;
let sessaoInicializada = false;

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

const buscarUsuarioComToken = async (token: string): Promise<UsuarioAutenticado> => {
  atualizarCarregandoUsuario(true);

  try {
    // Garante que o token está no storage antes do interceptor rodar
    await salvarTokenSeguro(token);
    const response = await api.get<UsuarioAutenticado>('/auth/me');
    atualizarUsuarioCompartilhado(response.data);
    return response.data;
  } finally {
    atualizarCarregandoUsuario(false);
  }
};

const restaurarSessaoSalva = async (): Promise<UsuarioAutenticado | null> => {
  if (sessaoInicializada) {
    return usuarioCompartilhado;
  }

  try {
    const token = await obterTokenSeguro();

    if (!token) {
      atualizarUsuarioCompartilhado(null);
      sessaoInicializada = true;
      return null;
    }

    const usuario = await buscarUsuarioComToken(token);
    sessaoInicializada = true;
    return usuario;
  } catch (error: any) {
    if (tokenInvalidoOuExpirado(error)) {
      await removerTokenSeguro();
      atualizarUsuarioCompartilhado(null);
      sessaoInicializada = true;
      return null;
    }

    console.warn('Erro ao restaurar sessão:', error);

    if (!avisoFalhaRestauracaoEmitido) {
      avisoFalhaRestauracaoEmitido = true;
      Alert.alert(
        'Não foi possível reconectar',
        'Sem problemas — é só entrar novamente para continuar.',
      );
    }

    return null;
  }
};

const limparSessao = async () => {
  await removerTokenSeguro();
  usuarioCompartilhado = null;
  carregandoUsuarioCompartilhado = false;
  sessaoInicializada = true;
  notificarSessao();
};

export function useAuth() {
  const [carregando, setCarregando] = useState(false);
  const [usuario, setUsuarioLocal] = useState<UsuarioAutenticado | null>(usuarioCompartilhado);
  const [carregandoUsuario, setCarregandoUsuarioLocal] = useState(carregandoUsuarioCompartilhado);

  useEffect(() => {
    const sincronizarEstado = () => {
      setUsuarioLocal(usuarioCompartilhado);
      setCarregandoUsuarioLocal(carregandoUsuarioCompartilhado);
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
      const usuarioAtual = await buscarUsuarioComToken(token);
      sessaoInicializada = true;
      return usuarioAtual;
    } catch (error: any) {
      if (tokenInvalidoOuExpirado(error)) {
        await limparSessao();
      }
      throw error;
    }
  };

  const login = async (
    email: string,
    senha: string,
    onSuccess: () => void,
    onEmailNaoVerificado?: () => void,
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

      const response = await api.post('/auth/login', {
        email: email.trim(),
        password: senha,
      });

      const { token } = response.data;
      await salvarTokenSeguro(token);
      await buscarUsuarioComToken(token);
      sessaoInicializada = true;
      onSuccess();
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
      // Garante que nenhum token antigo de acesso continue válido no aparelho
      await removerTokenSeguro();
      atualizarUsuarioCompartilhado(null);
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
    } catch (error) {
      console.warn('Não foi possível notificar o servidor do logout:', error);
    }

    resetarRascunho();
    await limparSessao();
  };

  return {
    login,
    registro,
    confirmarEmail,
    reenviarCodigo,
    solicitarRedefinicao,
    confirmarCodigoRedefinicao,
    redefinirSenha,
    logout,
    buscarUsuario,
    carregando,
    carregandoUsuario,
    usuario,
  };
}