import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import CustomButton from '../../../components/ui/CustomButton';
import { styles as base } from '../consentimento/styleConsentimento';
import { mensagemDeErro } from '../../../lib/vinculoService';
import { buscarConta, esquecerCelulares, exportarDados } from '../../../lib/contaService';

type Props = NativeStackScreenProps<RootStackParamList, 'Privacidade'>;

export default function Privacidade({ navigation }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [confiaveis, setConfiaveis] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState<'pdf' | 'json' | 'esquecer' | null>(null);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  const carregar = useCallback(() => {
    buscarConta()
      .then((c) => setConfiaveis(c.dispositivosConfiaveis))
      .catch(() => setConfiaveis(null));
  }, []);

  useEffect(carregar, [carregar]);

  const exportar = async (formato: 'pdf' | 'json') => {
    setOcupado(formato);
    setAviso(null);
    try {
      await exportarDados(formato);
    } catch (e) {
      setAviso({ ok: false, texto: mensagemDeErro(e, 'Não foi possível gerar o arquivo agora. Tente de novo.') });
    } finally {
      setOcupado(null);
    }
  };

  const esquecer = async () => {
    setOcupado('esquecer');
    setAviso(null);
    try {
      const n = await esquecerCelulares();
      setConfiaveis(0);
      setAviso({ ok: true, texto: n ? 'Pronto: todo celular vai pedir o código do e-mail no próximo login.' : 'Nenhum celular confiável.' });
    } catch (e) {
      setAviso({ ok: false, texto: mensagemDeErro(e, 'Não foi possível agora. Tente de novo.') });
    } finally {
      setOcupado(null);
    }
  };

  const cartao = [
    base.cartao,
    local.cartao,
    { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outlineVariant, borderRadius: theme.borderRadius.lg },
  ];

  return (
    <View style={[base.tela, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View style={base.cabecalho}>
        <TouchableOpacity style={base.botaoVoltar} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Voltar">
          <Feather name="arrow-left" size={22} color={theme.colors.onBackground} />
        </TouchableOpacity>
        <Text style={[base.tituloCabecalho, { color: theme.colors.onBackground }]} accessibilityRole="header">
          Privacidade e segurança
        </Text>
      </View>

      <ScrollView contentContainerStyle={[base.conteudo, { paddingBottom: insets.bottom + 40 }]}>
        <TouchableOpacity style={[cartao, local.linha]} onPress={() => navigation.navigate('Consentimento')} accessibilityRole="button">
          <Feather name="lock" size={20} color={theme.colors.primary} />
          <View style={base.linhaTextos}>
            <Text style={[base.rotulo, { color: theme.colors.onSurface }]}>O que meu psicólogo vê</Text>
            <Text style={[base.descricao, { color: theme.colors.onSurfaceVariant }]}>
              Escolha por categoria: humor, hábitos, escalas e diário.
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>

        <View style={cartao}>
          <Text style={[base.rotulo, { color: theme.colors.onSurface }]} accessibilityRole="header">Seus dados</Text>
          <Text style={[base.descricao, { color: theme.colors.onSurfaceVariant }]}>
            Pela LGPD, você pode ter uma cópia de tudo o que registrou: check-ins, diário e escalas. O PDF é para ler;
            o JSON serve para levar os dados a outro sistema.
          </Text>
          <CustomButton title="Baixar em PDF" onPress={() => void exportar('pdf')} loading={ocupado === 'pdf'} disabled={ocupado !== null} />
          <CustomButton
            title="Baixar em JSON"
            variant="outline"
            onPress={() => void exportar('json')}
            loading={ocupado === 'json'}
            disabled={ocupado !== null}
          />
        </View>

        <View style={cartao}>
          <Text style={[base.rotulo, { color: theme.colors.onSurface }]} accessibilityRole="header">Celulares confiáveis</Text>
          <Text style={[base.descricao, { color: theme.colors.onSurfaceVariant }]}>
            {confiaveis === null
              ? 'Celulares em que você marcou "confiar" entram só com a senha, sem o código do e-mail, por 30 dias.'
              : `${confiaveis === 1 ? '1 celular entra' : `${confiaveis} celulares entram`} só com a senha, sem o código do e-mail.`}
          </Text>
          <CustomButton
            title="Esquecer todos os celulares"
            variant="outline"
            onPress={() => void esquecer()}
            loading={ocupado === 'esquecer'}
            disabled={ocupado !== null || confiaveis === 0}
          />
        </View>

        {aviso && (
          <Text style={[base.descricao, { color: aviso.ok ? theme.colors.onBackground : theme.colors.error }]} accessibilityRole="alert">
            {aviso.texto}
          </Text>
        )}

        <Text style={[base.descricao, { color: theme.colors.onSurfaceVariant }]}>
          Seus textos, emoções e respostas de escalas ficam cifrados no servidor, e cada vez que seu psicólogo abre seus dados
          fica registrado. Para apagar sua conta, vá em Configurações da conta.
        </Text>
      </ScrollView>
    </View>
  );
}

const local = StyleSheet.create({
  cartao: { padding: 16, gap: 12 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
