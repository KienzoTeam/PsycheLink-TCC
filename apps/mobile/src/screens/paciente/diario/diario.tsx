import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import CustomButton from '../../../components/ui/CustomButton';
import { buscarDiarioPadrao } from '../../../lib/checkinService';
import { mensagemDeErro } from '../../../lib/vinculoService';
import {
  apagarEntrada,
  compartilharEntrada,
  EntradaDiario,
  escreverNoDiario,
  listarDiario,
} from '../../../lib/diarioService';

type Props = NativeStackScreenProps<RootStackParamList, 'Diario'>;

const LIMITE = 5000;

const quando = (iso: string) => {
  const d = new Date(iso);
  const dia = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  return `${dia}, ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

export default function Diario({ navigation }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [entradas, setEntradas] = useState<EntradaDiario[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [compartilhar, setCompartilhar] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const [lista, padrao] = await Promise.all([listarDiario(), buscarDiarioPadrao().catch(() => false)]);
      setEntradas(lista);
      setCompartilhar(padrao);
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível carregar seu diário. Verifique sua conexão.'));
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const salvar = async () => {
    setSalvando(true);
    try {
      const nova = await escreverNoDiario(texto.trim(), compartilhar);
      setEntradas((atuais) => [nova, ...(atuais ?? [])]);
      setTexto('');
    } catch (e) {
      Alert.alert('Não foi possível salvar', mensagemDeErro(e, 'Seu texto continua aqui. Tente de novo.'));
    } finally {
      setSalvando(false);
    }
  };

  const alternar = async (entrada: EntradaDiario) => {
    try {
      const nova = await compartilharEntrada(entrada.id, !entrada.compartilhado);
      setEntradas((atuais) => atuais?.map((e) => (e.id === nova.id ? nova : e)) ?? null);
    } catch (e) {
      Alert.alert('Não foi possível mudar', mensagemDeErro(e, 'Tente de novo em instantes.'));
    }
  };

  const apagar = (entrada: EntradaDiario) =>
    Alert.alert('Apagar este texto?', 'Ele some do seu diário e, se estava compartilhado, também para o seu psicólogo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          try {
            await apagarEntrada(entrada.id);
            setEntradas((atuais) => atuais?.filter((e) => e.id !== entrada.id) ?? null);
          } catch (e) {
            Alert.alert('Não foi possível apagar', mensagemDeErro(e, 'Tente de novo em instantes.'));
          }
        },
      },
    ]);

  const cartao = { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outlineVariant };

  const escrever = (
    <View style={[estilos.cartao, cartao, estilos.escrever]}>
      <TextInput
        value={texto}
        onChangeText={setTexto}
        placeholder="Como você está? Escreva o que quiser."
        placeholderTextColor={theme.colors.onSurfaceVariant}
        multiline
        maxLength={LIMITE}
        style={[estilos.campo, { color: theme.colors.onSurface, borderColor: theme.colors.outline }]}
        accessibilityLabel="Texto do diário"
      />
      <View style={estilos.linha}>
        <Text style={[estilos.rotulo, { color: theme.colors.onSurface }]} aria-hidden>
          Compartilhar com meu psicólogo
        </Text>
        <Switch
          value={compartilhar}
          onValueChange={setCompartilhar}
          trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primary }}
          accessibilityLabel="Compartilhar com meu psicólogo"
        />
      </View>
      <CustomButton title="Salvar no diário" onPress={() => void salvar()} loading={salvando} disabled={!texto.trim()} />
    </View>
  );

  const renderItem = ({ item }: { item: EntradaDiario }) => (
    <View style={[estilos.cartao, cartao, { gap: 8 }]}>
      <View style={estilos.linha}>
        <Text style={[estilos.quando, { color: theme.colors.onSurfaceVariant }]}>{quando(item.criadoEm)}</Text>
        <TouchableOpacity
          onPress={() => apagar(item)}
          style={estilos.icone}
          accessibilityRole="button"
          accessibilityLabel={`Apagar texto de ${quando(item.criadoEm)}`}
        >
          <Feather name="trash-2" size={18} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>
      <Text style={[estilos.texto, { color: theme.colors.onSurface }]}>{item.texto ?? 'Não foi possível ler este texto.'}</Text>
      <View style={estilos.linha}>
        <View style={estilos.privacidade} aria-hidden>
          <Feather name={item.compartilhado ? 'eye' : 'lock'} size={14} color={theme.colors.onSurfaceVariant} />
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>
            {item.compartilhado ? 'Seu psicólogo vê' : 'Só você vê'}
          </Text>
        </View>
        <Switch
          value={item.compartilhado}
          onValueChange={() => void alternar(item)}
          trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primary }}
          accessibilityLabel="Compartilhar este texto com meu psicólogo"
        />
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[estilos.tela, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={estilos.cabecalho}>
        <TouchableOpacity style={estilos.icone} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Voltar">
          <Feather name="arrow-left" size={22} color={theme.colors.onBackground} />
        </TouchableOpacity>
        <Text style={[estilos.titulo, { color: theme.colors.onBackground }]} accessibilityRole="header">
          Diário
        </Text>
      </View>

      <FlatList
        data={entradas ?? []}
        keyExtractor={(e) => String(e.id)}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[estilos.lista, { paddingBottom: insets.bottom + 32 }]}
        ListHeaderComponent={erro ? undefined : escrever}
        ListEmptyComponent={
          erro ? (
            <View style={estilos.centro}>
              <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>{erro}</Text>
              <TouchableOpacity onPress={carregar} style={estilos.botaoTexto} accessibilityRole="button">
                <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Tentar de novo</Text>
              </TouchableOpacity>
            </View>
          ) : entradas === null ? (
            <View style={estilos.centro} accessibilityRole="progressbar" accessibilityLabel="Carregando diário">
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : (
            <Text style={[estilos.vazio, { color: theme.colors.onSurfaceVariant }]}>
              Seus textos aparecem aqui, do mais novo para o mais antigo. Só você vê, a não ser que escolha compartilhar.
            </Text>
          )
        }
      />
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8 },
  titulo: { flex: 1, fontSize: 20, fontWeight: '700' },
  icone: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  lista: { padding: 16, gap: 12 },
  cartao: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  escrever: { gap: 12, marginBottom: 8 },
  campo: { minHeight: 120, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16, lineHeight: 22, textAlignVertical: 'top' },
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rotulo: { flex: 1, fontSize: 15, fontWeight: '500' },
  quando: { fontSize: 13, textTransform: 'capitalize' },
  texto: { fontSize: 16, lineHeight: 24 },
  privacidade: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  centro: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  botaoTexto: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  vazio: { fontSize: 14, lineHeight: 20, textAlign: 'center', paddingVertical: 24 },
});
