import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

const API_URL = 'http://localhost:3000';

export function useAuth() {
  const [carregando, setCarregando] = useState(false);

  // Função auxiliar segura para guardar o token dependendo da plataforma
  const salvarTokenSeguro = async (token: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem('psychelink_token', token);
    } else {
      await SecureStore.setItemAsync('psychelink_token', token);
    }
  };

  const login = async (email: string, senha: string, onSuccess: () => void) => {
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
      const response = await axios.post(`${API_URL}/login`, {
        email: email.trim().toLowerCase(),
        password: senha
      });

      const { token } = response.data;
      
      // ✅ Usa a função compatível com Web e Mobile
      await salvarTokenSeguro(token);
      
      onSuccess();
    } catch (error: any) {
      const mensagemErro = error.response?.data?.error || 'Não foi possível conectar ao servidor. Verifique sua rede.';
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
      Alert.alert('Atenção', 'Você deve aceitar os Termos de Uso e a Política de Privacidade.'); 
      return; 
    }
    
    setCarregando(true);
    try {
      console.log("Enviando requisição de registro para:", `${API_URL}/registro`);
      
      await axios.post(`${API_URL}/registro`, {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        password: senha,
        dataNascimento: dataNascimento
      });

      Alert.alert('Sucesso!', 'Sua conta foi criada. Faça o login para continuar.');
      onSuccess();
    } catch (error: any) {
      console.error("Erro no registro:", error);
      const mensagemErro = error.response?.data?.error || 'Não foi possível conectar ao servidor. Tente novamente mais tarde.';
      Alert.alert('Falha no Registro', mensagemErro);
    } finally {
      setCarregando(false);
    }
  };

  const esqueceuSenha = (email: string, onSuccess: () => void) => {
    if (!email.trim()) { 
      Alert.alert('Atenção', 'Informe seu e-mail.'); 
      return; 
    }
    if (!email.includes('@')) { 
      Alert.alert('Atenção', 'E-mail inválido.'); 
      return; 
    }
    onSuccess();
  };

  const verificarCodigo = (code: string[], onSuccess: () => void) => {
    const codigoCompleto = code.join('');
    if (codigoCompleto.length < 6) { 
      Alert.alert('Atenção', 'Informe o código completo de 6 dígitos.'); 
      return; 
    }
    onSuccess();
  };

  const novaSenha = (senha: string, confirmarSenha: string, onSuccess: () => void) => {
    if (!senha.trim() || senha.length < 8) { 
      Alert.alert('Atenção', 'A senha deve ter no mínimo 8 caracteres.'); 
      return; 
    }
    if (senha !== confirmarSenha) { 
      Alert.alert('Atenção', 'As senhas não coincidem.'); 
      return; 
    }
    onSuccess();
  };

  return { login, registro, esqueceuSenha, verificarCodigo, novaSenha, carregando };
}