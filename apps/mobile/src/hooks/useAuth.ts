import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import axios from 'axios';

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
    onSuccess: () => void
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
        email: email.trim().toLowerCase(),
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

    if (!email.trim()) {
      Alert.alert('Atenção', 'Informe seu e-mail.');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Atenção', 'E-mail inválido.');
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
      await axios.post(`${API_URL}/registro`, {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        password: senha,
        dataNascimento
      });

      Alert.alert(
        'Sucesso!',
        'Sua conta foi criada. Faça o login para continuar.'
      );

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

  const esqueceuSenha = (email: string, onSuccess: () => void) => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Atenção', 'Informe um e-mail válido.');
      return;
    }

    onSuccess();
  };

  const verificarCodigo = (code: string[], onSuccess: () => void) => {
    if (code.join('').length < 6) {
      Alert.alert('Atenção', 'Informe o código completo de 6 dígitos.');
      return;
    }

    onSuccess();
  };

  const novaSenha = (
    senha: string,
    confirmarSenha: string,
    onSuccess: () => void
  ) => {
    if (!senha.trim() || senha.length < 8 || senha !== confirmarSenha) {
      Alert.alert(
        'Atenção',
        'As senhas devem coincidir e ter no mínimo 8 caracteres.'
      );
      return;
    }

    onSuccess();
  };
  const logout = async () => {
    await limparSessao();
  };

  return {
    login,
    registro,
    esqueceuSenha,
    verificarCodigo,
    novaSenha,
    logout,
    buscarUsuario,
    carregando,
    carregandoUsuario,
    usuario
  };
}