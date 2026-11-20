import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { useAuth } from '../../../hooks/useAuth';
import CustomButton from '../../../components/ui/CustomButton';
import CustomInput from '../../../components/ui/CustomInput';
import PasswordInput from '../../../components/ui/PasswordInput';
import { styles as base } from '../consentimento/styleConsentimento';
import { mensagemDeErro } from '../../../lib/vinculoService';
import { agendarExclusao, buscarConta, Conta, mudarNome, trocarSenha } from '../../../lib/contaService';

type Props = NativeStackScreenProps<RootStackParamList, 'ConfiguracoesConta'>;
type Aviso = { ok: boolean; texto: string } | null;

export default function ConfiguracoesConta({ navigation }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { renovarSessao, renomear, logout } = useAuth();
  const [conta, setConta] = useState<Conta | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [senhaExclusao, setSenhaExclusao] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const [ocupado, setOcupado] = useState<'nome' | 'senha' | 'excluir' | null>(null);
  const [aviso, setAviso] = useState<{ nome: Aviso; senha: Aviso; excluir: Aviso }>({ nome: null, senha: null, excluir: null });

  useEffect(() => {
    buscarConta()
      .then((c) => {
        setConta(c);
        setNome(c.nome);
      })
      .catch((e) => setErro(mensagemDeErro(e, 'Não foi possível carregar sua conta. Verifique sua conexão.')));
  }, []);

  const avisar = (campo: keyof typeof aviso, valor: Aviso) => setAviso((a) => ({ ...a, [campo]: valor }));

  const salvarNome = async () => {
    setOcupado('nome');
    try {
      renomear(await mudarNome(nome.trim()));
      avisar('nome', { ok: true, texto: 'Nome atualizado.' });
    } catch (e) {
      avisar('nome', { ok: false, texto: mensagemDeErro(e, 'Não foi possível salvar o nome.') });
    } finally {
      setOcupado(null);
    }
  };

  const salvarSenha = async () => {
    setOcupado('senha');
    try {
      const { token, usuario } = await trocarSenha(senhaAtual, novaSenha);
      await renovarSessao(token, usuario);
      setSenhaAtual('');
      setNovaSenha('');
      avisar('senha', { ok: true, texto: 'Senha trocada. Outros celulares precisam entrar de novo e confirmar o código.' });
    } catch (e) {
      avisar('senha', { ok: false, texto: mensagemDeErro(e, 'Não foi possível trocar a senha.') });
    } finally {
      setOcupado(null);
    }
  };

  const excluir = async () => {
    setOcupado('excluir');
    try {
      await agendarExclusao(senhaExclusao);
      const data = new Date(Date.now() + 30 * 86_400_000).toLocaleDateString('pt-BR');
      Alert.alert(
        'Exclusão agendada',
        `Sua conta e seus registros serão apagados em ${data}. Até lá, se mudar de ideia, entre de novo e toque em "Cancelar exclusão".`,
        [{ text: 'Entendi', onPress: () => void logout() }],
      );
    } catch (e) {
      avisar('excluir', { ok: false, texto: mensagemDeErro(e, 'Não foi possível agendar a exclusão.') });
      setOcupado(null);
    }
  };

  const cartao = [
    base.cartao,
    local.cartao,
    { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outlineVariant, borderRadius: theme.borderRadius.lg },
  ];

  const mensagem = (a: Aviso) =>
    a && (
      <Text style={[base.descricao, { color: a.ok ? theme.colors.onSurface : theme.colors.error }]} accessibilityRole="alert">
        {a.texto}
      </Text>
    );

  return (
    <View style={[base.tela, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View style={base.cabecalho}>
        <TouchableOpacity style={base.botaoVoltar} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Voltar">
          <Feather name="arrow-left" size={22} color={theme.colors.onBackground} />
        </TouchableOpacity>
        <Text style={[base.tituloCabecalho, { color: theme.colors.onBackground }]} accessibilityRole="header">
          Configurações da conta
        </Text>
      </View>

      <ScrollView contentContainerStyle={[base.conteudo, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
        {erro ? (
          <Text style={[base.textoCentral, { color: theme.colors.onBackground }]}>{erro}</Text>
        ) : !conta ? (
          <View style={base.centralizado} accessibilityRole="progressbar" accessibilityLabel="Carregando sua conta">
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : (
          <>
            <View style={cartao}>
              <Text style={[base.rotulo, { color: theme.colors.onSurface }]} accessibilityRole="header">Seus dados</Text>
              <CustomInput label="Nome" value={nome} onChangeText={setNome} autoCapitalize="words" />
              <Text style={[base.descricao, { color: theme.colors.onSurfaceVariant }]}>E-mail: {conta.email}</Text>
              <CustomButton
                title="Salvar nome"
                onPress={() => void salvarNome()}
                loading={ocupado === 'nome'}
                disabled={nome.trim().length < 2 || nome.trim() === conta.nome}
              />
              {mensagem(aviso.nome)}
            </View>

            <View style={cartao}>
              <Text style={[base.rotulo, { color: theme.colors.onSurface }]} accessibilityRole="header">Trocar senha</Text>
              <PasswordInput label="Senha atual" placeholder="Sua senha de hoje" value={senhaAtual} onChangeText={setSenhaAtual} />
              <PasswordInput label="Nova senha" placeholder="A nova senha" value={novaSenha} onChangeText={setNovaSenha} medidor />
              <CustomButton
                title="Trocar senha"
                onPress={() => void salvarSenha()}
                loading={ocupado === 'senha'}
                disabled={!senhaAtual || !novaSenha}
              />
              {mensagem(aviso.senha)}
            </View>

            <View style={[cartao, { borderColor: theme.colors.error }]}>
              <Text style={[base.rotulo, { color: theme.colors.onSurface }]} accessibilityRole="header">Excluir conta</Text>
              <Text style={[base.descricao, { color: theme.colors.onSurfaceVariant }]}>
                Seus check-ins, diário e escalas são apagados 30 dias depois do pedido. Nesse meio tempo você pode desistir
                entrando de novo. O vínculo com seu psicólogo termina na hora; as anotações dele continuam com ele, como manda
                o Conselho Federal de Psicologia. Se quiser uma cópia dos seus dados, exporte antes em Privacidade e
                segurança.
              </Text>
              {excluindo ? (
                <>
                  <PasswordInput label="Confirme sua senha" placeholder="Sua senha" value={senhaExclusao} onChangeText={setSenhaExclusao} />
                  <TouchableOpacity
                    style={[local.botaoPerigo, { backgroundColor: theme.colors.error }]}
                    onPress={() => void excluir()}
                    disabled={!senhaExclusao || ocupado === 'excluir'}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !senhaExclusao || ocupado === 'excluir' }}
                  >
                    {ocupado === 'excluir' ? (
                      <ActivityIndicator color={theme.colors.onError} />
                    ) : (
                      <Text style={[base.rotulo, { color: theme.colors.onError }]}>Excluir minha conta em 30 dias</Text>
                    )}
                  </TouchableOpacity>
                  {mensagem(aviso.excluir)}
                </>
              ) : (
                <CustomButton title="Quero excluir minha conta" variant="outline" onPress={() => setExcluindo(true)} />
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const local = StyleSheet.create({
  cartao: { padding: 16, gap: 12 },
  botaoPerigo: { minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
});
