import { Alert } from 'react-native';

type OpcaoExtra = {
  texto: string;
  onPress: () => void;
};

/**
 * Sinalização honesta de protótipo: todo fluxo ainda não conectado ao
 * backend responde ao toque com este aviso — nunca deixamos um CTA morto.
 * `opcaoExtra` permite oferecer um caminho real (ex.: CVV) no mesmo diálogo.
 */
export function alertarDemonstracao(opcaoExtra?: OpcaoExtra) {
  const botoes: { text: string; style?: 'cancel'; onPress?: () => void }[] = [];

  if (opcaoExtra) {
    botoes.push({ text: opcaoExtra.texto, onPress: opcaoExtra.onPress });
  }
  botoes.push({ text: 'Entendi', style: 'cancel' });

  Alert.alert(
    '🚧 Demonstração',
    'Este app é um protótipo acadêmico; este recurso ainda não está conectado ao servidor.',
    botoes
  );
}
