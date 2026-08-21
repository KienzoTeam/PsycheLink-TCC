import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import axios from 'axios';
import { erroEmail } from '../lib/email';

const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'web' || !devHost ? 'http://localhost:3000' : `http://${devHost}:3000`);
const TOKEN_KEY = 'psychelink_token';

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


//Salva o JWT: 
const salvarTokenSeguro = async (token: string) => {
  if (Platform.OS === 'web') {
    localStorage.setItem(TOKEN_KEY, token);
    return;
  }

  await SecureStore.setItemAsync(TOKEN_KEY, token);
};


//Recupera o JWT:
const obterTokenSeguro = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(TOKEN_KEY);
  }

  return SecureStore.getItemAsync(TOKEN_KEY);
};


//Remove o JWT ao fazer logout ou quando o token for inválido/expirado.

const removerTokenSeguro = async () => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(TOKEN_KEY);
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
      Alert.alert('Atenção', 'Informe seu e-mail.');
      return;
    }

    if (!senha.trim()) {
      Alert.alert('Atenção', 'Informe sua senha.');
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
        'Não foi possível conectar ao servidor. Verifique sua rede.';

      Alert.alert('Falha no Login', mensagemErro);
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
      Alert.alert('Atenção', 'Informe seu nome completo.');
      return;
    }

    // Checagem leve só para UX; a validação definitiva é a do servidor.
    const erroEmailMsg = erroEmail(email);
    if (erroEmailMsg) {
      Alert.alert('Atenção', erroEmailMsg);
      return;
    }

    if (!senha.trim() || senha.length < 8) {
      Alert.alert('Atenção', 'A senha deve ter no mínimo 8 caracteres.');
      return;
    }

    if (senha !== confirmarSenha) {
      Alert.alert('Atenção', 'As senhas não coincidem.');
      return;
    }

    if (!dataNascimento.trim()) {
      Alert.alert('Atenção', 'Informe sua data de nascimento.');
      return;
    }

    if (!aceito) {
      Alert.alert(
        'Atenção',
        'Você deve aceitar os Termos de Uso e a Política de Privacidade.'
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

      Alert.alert('Falha no Registro', mensagemErro);
    } finally {
      setCarregando(false);
    }
  };

  const confirmarEmail = async (
    email: string,
    codigo: string
  ): Promise<boolean> => {
    if (codigo.length < 6) {
      Alert.alert('Atenção', 'Informe o código completo de 6 dígitos.');
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
        'Erro',
        error.response?.data?.error ||
          'Não foi possível verificar o código. Tente novamente.'
      );
      return false;
    }
  };

  const reenviarCodigo = async (email: string): Promise<boolean> => {
    try {
      await axios.post(`${API_URL}/reenviar-codigo`, { email: email.trim() });
      Alert.alert(
        'Sucesso',
        'Se houver uma conta pendente, você receberá um novo código.'
      );
      return true;
    } catch (error: any) {
      Alert.alert(
        'Erro',
        error.response?.data?.error || 'Falha ao reenviar código.'
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
      Alert.alert('Erro', error.response?.data?.error || 'Falha ao solicitar o código.');
      return false;
    }
  };

  // Passo 2: valida o código e recebe o token de redefinição.
  const confirmarCodigoRedefinicao = async (
    email: string,
    codigo: string
  ): Promise<string | null> => {
    if (codigo.length < 6) {
      Alert.alert('Atenção', 'Informe o código completo de 6 dígitos.');
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
        'Erro',
        error.response?.data?.error || 'Não foi possível verificar o código.'
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
      Alert.alert('Erro', error.response?.data?.error || 'Falha ao redefinir a senha.');
      return false;
    }
  };

  const logout = async () => {
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