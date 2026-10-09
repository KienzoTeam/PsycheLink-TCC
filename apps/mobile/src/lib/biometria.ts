import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIA_ATIVADA_KEY = 'psychelink_biometria_ativa';
const EMAIL_BIOMETRIA_KEY = 'psychelink_bio_email';
const SENHA_BIOMETRIA_KEY = 'psychelink_bio_senha';

/** Verifica se o aparelho tem leitor de impressão digital (sem Face ID) */
export async function dispositivoTemDigital(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const temHardware = await LocalAuthentication.hasHardwareAsync();
  if (!temHardware) return false;

  const tipos = await LocalAuthentication.supportedAuthenticationTypesAsync();
  return tipos.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
}

/** Verifica se o usuário ativou a biometria no app */
export async function biometriaEstaAtivada(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const ativada = await SecureStore.getItemAsync(BIOMETRIA_ATIVADA_KEY);
  return ativada === 'true';
}

/** Salva as credenciais no cofre seguro do celular para uso futuro com a digital */
export async function salvarCredenciaisBiometria(email: string, senha: string): Promise<void> {
  if (!email || !senha) return;
  await SecureStore.setItemAsync(BIOMETRIA_ATIVADA_KEY, 'true');
  await SecureStore.setItemAsync(EMAIL_BIOMETRIA_KEY, email.trim().toLowerCase());
  await SecureStore.setItemAsync(SENHA_BIOMETRIA_KEY, senha);
}

/** Remove a biometria e limpa o cofre do dispositivo */
export async function desativarBiometria(): Promise<void> {
  await SecureStore.deleteItemAsync(BIOMETRIA_ATIVADA_KEY);
  await SecureStore.deleteItemAsync(EMAIL_BIOMETRIA_KEY);
  await SecureStore.deleteItemAsync(SENHA_BIOMETRIA_KEY);
}

/** Lê e-mail e senha guardados com segurança no hardware do aparelho */
export async function obterCredenciaisBiometria(): Promise<{ email: string | null; senha: string | null }> {
  const email = await SecureStore.getItemAsync(EMAIL_BIOMETRIA_KEY);
  const senha = await SecureStore.getItemAsync(SENHA_BIOMETRIA_KEY);
  return { email, senha };
}

/** Solicita o sensor de digital nativo do celular */
export async function autenticarComDigital(): Promise<boolean> {
  const temDigital = await dispositivoTemDigital();
  if (!temDigital) return false;

  const resultado = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Confirme sua digital para entrar no PsycheLink',
    cancelLabel: 'Cancelar',
    disableDeviceFallback: true, // Força apenas a digital
  });

  return resultado.success === true;
}