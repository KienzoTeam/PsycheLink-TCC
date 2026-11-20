import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { styles as base } from '../consentimento/styleConsentimento';
import { vibrarLeve } from '../../../lib/hapticos';
import { EMAIL_SUPORTE } from '../../../constants/contato';

type Props = NativeStackScreenProps<RootStackParamList, 'Ajuda'>;

// Perguntas sobre o que este app faz de verdade (cada resposta confere com o comportamento atual).
const PERGUNTAS = [
  {
    p: 'Meu psicólogo vê tudo o que eu registro?',
    r: 'Não. Ele vê só as categorias que você libera em Privacidade e segurança, e do diário só os textos que você marcar para compartilhar. Você pode mudar isso quando quiser, e vale na hora.',
  },
  {
    p: 'O PsycheLink dá diagnóstico?',
    r: 'Não. Os gráficos e números mostram o que você registrou. Quem interpreta é o seu psicólogo, na sessão.',
  },
  {
    p: 'Como me vinculo ao meu psicólogo?',
    r: 'Peça a ele o código de 6 dígitos (vale por 24 horas) e digite na tela de vínculo. Sem vínculo, nenhum psicólogo vê o que você registra.',
  },
  {
    p: 'Posso fazer mais de um check-in por dia?',
    r: 'O check-in é um por dia. Para escrever mais vezes, use o Diário, na tela inicial.',
  },
  {
    p: 'Esqueci minha senha.',
    r: 'Na tela de entrada, toque em "Esqueci minha senha". Enviamos um código para o seu e-mail.',
  },
  {
    p: 'Como apago minha conta?',
    r: 'Em Configurações da conta, no fim da tela. A exclusão acontece 30 dias depois do pedido, e até lá você pode desistir entrando de novo.',
  },
];

export default function Ajuda({ navigation }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [aberta, setAberta] = useState<number | null>(null);

  const cartao = [
    base.cartao,
    { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outlineVariant, borderRadius: theme.borderRadius.lg },
  ];

  return (
    <View style={[base.tela, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View style={base.cabecalho}>
        <TouchableOpacity style={base.botaoVoltar} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Voltar">
          <Feather name="arrow-left" size={22} color={theme.colors.onBackground} />
        </TouchableOpacity>
        <Text style={[base.tituloCabecalho, { color: theme.colors.onBackground }]} accessibilityRole="header">
          Ajuda e suporte
        </Text>
      </View>

      <ScrollView contentContainerStyle={[base.conteudo, { paddingBottom: insets.bottom + 40 }]}>
        <View style={[local.crise, { backgroundColor: theme.colors.primaryContainer, borderRadius: theme.borderRadius.lg }]}>
          <Text style={[base.rotulo, { color: theme.colors.onPrimaryContainer }]} accessibilityRole="header">
            Precisa de ajuda agora?
          </Text>
          <Text style={[base.descricao, { color: theme.colors.onPrimaryContainer }]}>
            O PsycheLink não substitui atendimento de emergência. O CVV atende de graça, 24 horas, pelo 188.
          </Text>
          <View style={local.botoes}>
            <TouchableOpacity
              style={[local.botao, { backgroundColor: theme.colors.primary }]}
              onPress={() => void Linking.openURL('tel:188')}
              accessibilityRole="button"
              accessibilityLabel="Ligar para o CVV, 188"
            >
              <Feather name="phone" size={18} color={theme.colors.onPrimary} />
              <Text style={[base.rotulo, { color: theme.colors.onPrimary }]}>Ligar 188</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[local.botao, { borderWidth: 1, borderColor: theme.colors.onPrimaryContainer }]}
              onPress={() => navigation.navigate('Main', { aba: 'SOS' })}
              accessibilityRole="button"
            >
              <Text style={[base.rotulo, { color: theme.colors.onPrimaryContainer }]}>Abrir SOS</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[base.rotulo, { color: theme.colors.onBackground }]} accessibilityRole="header">Perguntas frequentes</Text>
        <View style={cartao}>
          {PERGUNTAS.map(({ p, r }, i) => (
            <React.Fragment key={p}>
              {i > 0 && <View style={[base.divisor, { backgroundColor: theme.colors.outlineVariant }]} />}
              <TouchableOpacity
                style={local.pergunta}
                onPress={() => {
                  vibrarLeve();
                  setAberta(aberta === i ? null : i);
                }}
                accessibilityRole="button"
                accessibilityState={{ expanded: aberta === i }}
              >
                <Text style={[base.rotulo, local.textoPergunta, { color: theme.colors.onSurface }]}>{p}</Text>
                <Feather name={aberta === i ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
              {aberta === i && (
                <Text style={[base.descricao, local.resposta, { color: theme.colors.onSurfaceVariant }]}>{r}</Text>
              )}
            </React.Fragment>
          ))}
        </View>

        {EMAIL_SUPORTE && (
          <TouchableOpacity
            style={[cartao, local.pergunta]}
            onPress={() => void Linking.openURL(`mailto:${EMAIL_SUPORTE}`)}
            accessibilityRole="link"
            accessibilityLabel={`Escrever para o suporte: ${EMAIL_SUPORTE}`}
          >
            <Feather name="mail" size={20} color={theme.colors.primary} />
            <View style={local.textoPergunta}>
              <Text style={[base.rotulo, { color: theme.colors.onSurface }]}>Fale com a equipe</Text>
              <Text style={[base.descricao, { color: theme.colors.onSurfaceVariant }]}>{EMAIL_SUPORTE}</Text>
            </View>
          </TouchableOpacity>
        )}

        <Text style={[base.descricao, { color: theme.colors.onSurfaceVariant, textAlign: 'center' }]}>
          PsycheLink {Constants.expoConfig?.version ?? ''} · Trabalho de Conclusão de Curso
        </Text>
      </ScrollView>
    </View>
  );
}

const local = StyleSheet.create({
  crise: { padding: 16, gap: 10 },
  botoes: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  botao: { minHeight: 48, borderRadius: 24, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pergunta: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  textoPergunta: { flex: 1 },
  resposta: { paddingHorizontal: 16, paddingBottom: 16 },
});
