import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import axios from 'axios';
import { erroEmail } from '../lib/email';
import { resetarRascunho } from '../lib/rascunhoCheckin';
import { salvarTokenSeguro, obterTokenSeguro, removerTokenSeguro } from '../lib/authToken';

const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'web' || !devHost ? 'http://localhost:3000' : `http://${devHost}:3000`);
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

const atualizarUsuarioCompartilhado = (
  usuario: UsuarioAutenticado | null
) => {
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


 //Busca o perfil do usuário autenticado.
const buscarUsuarioComToken = async (
  token: string
): Promise<UsuarioAutenticado> => {
  atualizarCarregandoUsuario(true);

  try {
    const response = await axios.get<UsuarioAutenticado>(`${API_URL}/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

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

    // Falha inesperada (ex.: rede): avisamos uma vez em vez de cair no Login em silêncio.
    if (!avisoFalhaRestauracaoEmitido) {
      avisoFalhaRestauracaoEmitido = true;
      Alert.alert(
        'Não foi possível reconectar',
        'Sem problemas — é só entrar novamente para continuar.'
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

  const [usuario, setUsuarioLocal] = useState<UsuarioAutenticado | null>(
    usuarioCompartilhado
  );

  const [carregandoUsuario, setCarregandoUsuarioLocal] = useState(
    carregandoUsuarioCompartilhado
  );

  
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
  
    //Função para buscar novamente o usuário autenticado.
    //Pode ser útil futuramente em uma tela de Perfil, por exemplo.
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
    onEmailNaoVerificado?: () => void
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

      const response = await axios.post(`${API_URL}/login`, {
        email: email.trim(),
        password: senha
      });

      const { token } = response.data;

      await salvarTokenSeguro(token);


      await buscarUsuarioComToken(token);

      sessaoInicializada = true;


      onSuccess();
    } catch (error: any) {

      if (tokenInvalidoOuExpirado(error)) {
        await limparSessao();
      }

      // Conta existe e senha confere, mas o e-mail ainda não foi confirmado:
      // o app navega para a tela de código em vez de mostrar erro genérico.
      if (
        error.response?.status === 403 &&
        error.response?.data?.codigo === 'EMAIL_NAO_VERIFICADO'
      ) {
        onEmailNaoVerificado?.();
        return;
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
    onSuccess: () => void
  ) => {
    if (!nome.trim()) {
      Alert.alert('Campo faltando', 'Digite seu nome completo para criar sua conta.');
      return;
    }

    // Checagem leve só para UX; a validação definitiva é a do servidor.
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

    // Validação real de calendário: 31/02 não passa, mesmo com o clamp da máscara.
    const [diaNasc, mesNasc, anoNasc] = dataNascimento.split('/').map(Number);
    const dataValida = new Date(anoNasc, (mesNasc || 0) - 1, diaNasc || 0);
    if (
      !anoNasc ||
      String(anoNasc).length !== 4 ||
      dataValida.getDate() !== diaNasc ||
      dataValida.getMonth() !== (mesNasc || 0) - 1
    ) {
      Alert.alert('Data inválida', 'Confira o dia, o mês e o ano da sua data de nascimento.');
      return;
    }

    if (!aceito) {
      Alert.alert(
        'Falta confirmar',
        'Para criar sua conta, leia e aceite os Termos de Uso e a Política de Privacidade.'
      );
      return;
    }

    setCarregando(true);

    try {
      // Normalização final (lowercase, IDN/punycode) é responsabilidade do servidor.
      await axios.post(`${API_URL}/registro`, {
        nome: nome.trim(),
        email: email.trim(),
        password: senha,
        dataNascimento
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

  const confirmarEmail = async (
    email: string,
    codigo: string
  ): Promise<boolean> => {
    if (codigo.length < 6) {
      Alert.alert('Código incompleto', 'Digite os 6 dígitos que enviamos para o seu e-mail.');
      return false;
    }

    try {
      await axios.post(`${API_URL}/verificar-email`, {
        email: email.trim(),
        codigo
      });
      return true;
    } catch (error: any) {
      Alert.alert(
        'Código não verificado',
        error.response?.data?.error ||
          'Confira os dígitos e tente novamente.'
      );
      return false;
    }
  };

  const reenviarCodigo = async (email: string): Promise<boolean> => {
    try {
      await axios.post(`${API_URL}/reenviar-codigo`, { email: email.trim() });
      Alert.alert(
        'Verifique seu e-mail',
        'Se houver uma conta pendente, você receberá um novo código em instantes.'
      );
      return true;
    } catch (error: any) {
      Alert.alert(
        'Não foi possível reenviar',
        error.response?.data?.error || 'Tente novamente em instantes.'
      );
      return false;
    }
  };

  // Redefinição de senha, passo 1: pede o código. O servidor responde
  // genericamente para não revelar se o e-mail tem conta ativa.
  const solicitarRedefinicao = async (email: string): Promise<boolean> => {
    try {
      await axios.post(`${API_URL}/esqueci-senha`, { email: email.trim() });
      return true;
    } catch (error: any) {
      Alert.alert('Não foi possível enviar o código', error.response?.data?.error || 'Tente novamente em instantes.');
      return false;
    }
  };

  // Passo 2: valida o código e recebe o token de redefinição.
  const confirmarCodigoRedefinicao = async (
    email: string,
    codigo: string
  ): Promise<string | null> => {
    if (codigo.length < 6) {
      Alert.alert('Código incompleto', 'Digite os 6 dígitos que enviamos para o seu e-mail.');
      return null;
    }

    try {
      const response = await axios.post(`${API_URL}/verificar-codigo-senha`, {
        email: email.trim(),
        codigo
      });
      return response.data.token as string;
    } catch (error: any) {
      Alert.alert(
        'Código não confirmado',
        error.response?.data?.error || 'Confira os dígitos ou peça um novo código.'
      );
      return null;
    }
  };

  // Passo 3: troca a senha com o token do passo 2.
  const redefinirSenha = async (token: string, senha: string): Promise<boolean> => {
    try {
      await axios.post(`${API_URL}/redefinir-senha`, { token, password: senha });
      return true;
    } catch (error: any) {
      Alert.alert('Não foi possível trocar a senha', error.response?.data?.error || 'O pedido pode ter expirado — comece novamente pelo e-mail.');
      return false;
    }
  };

  const logout = async () => {
    // Avisa o servidor pra invalidar a sessão de verdade (revoga o token,
    // não só apaga ele localmente). Best-effort: se a rede falhar, ainda
    // assim limpa a sessão local — o usuário não pode ficar preso numa
    // tela de logout por falta de internet. O token vai continuar válido
    // no servidor até expirar sozinho nesse cenário raro de falha de rede.
    try {
      const token = await obterTokenSeguro();
      if (token) {
        await axios.post(
          `${API_URL}/logout`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }
    } catch (error) {
      console.warn('Não foi possível notificar o servidor do logout:', error);
    }

    // O rascunho emocional do check-in é dado do usuário: sai junto com a sessão.
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
    usuario
  };
}
