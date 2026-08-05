import { useState } from 'react';
import { Alert } from 'react-native';

export function useAuth() {
  const [carregando, setCarregando] = useState(false);

  const login = (email: string, senha: string, onSuccess: () => void) => {
    if (!email.trim()) {
      Alert.alert('Erro', 'Informe seu e-mail.');
      return;
    }
    if (!senha.trim()) {
      Alert.alert('Erro', 'Informe sua senha.');
      return;
    }
    onSuccess();
  };

  const registro = (
    nome: string,
    email: string,
    senha: string,
    confirmarSenha: string,
    dataNascimento: string,
    aceito: boolean,
    onSuccess: () => void
  ) => {
    if (!nome.trim()) { Alert.alert('Erro', 'Informe seu nome.'); return; }
    if (!email.trim()) { Alert.alert('Erro', 'Informe seu e-mail.'); return; }
    if (!email.includes('@')) { Alert.alert('Erro', 'E-mail inválido.'); return; }
    if (!senha.trim() || senha.length < 8) { Alert.alert('Erro', 'Senha deve ter no mínimo 8 caracteres.'); return; }
    if (senha !== confirmarSenha) { Alert.alert('Erro', 'As senhas não coincidem.'); return; }
    if (!dataNascimento.trim()) { Alert.alert('Erro', 'Informe sua data de nascimento.'); return; }
    if (!aceito) { Alert.alert('Erro', 'Aceite os Termos de Uso.'); return; }
    onSuccess();
  };

  const esqueceuSenha = (email: string, onSuccess: () => void) => {
    if (!email.trim()) { Alert.alert('Erro', 'Informe seu e-mail.'); return; }
    if (!email.includes('@')) { Alert.alert('Erro', 'E-mail inválido.'); return; }
    onSuccess();
  };

  const verificarCodigo = (code: string[], onSuccess: () => void) => {
    const codigoCompleto = code.join('');
    if (codigoCompleto.length < 6) {
      Alert.alert('Erro', 'Informe o código completo de 6 dígitos.');
      return;
    }
    onSuccess();
  };

  const novaSenha = (senha: string, confirmarSenha: string, onSuccess: () => void) => {
    if (!senha.trim() || senha.length < 8) {
      Alert.alert('Erro', 'Senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (senha !== confirmarSenha) {
      Alert.alert('Erro', 'As senhas não coincidem.');
      return;
    }
    onSuccess();
  };

  return { login, registro, esqueceuSenha, verificarCodigo, novaSenha, carregando };
}