import React, { useCallback, useEffect, useState } from 'react';
import { View, Text,ScrollView,TouchableOpacity,Linking,Alert,Modal,TextInput,} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts';
import { useTheme } from '../../../theme/ThemeContext';
import ExercicioRespiracao from '../../../components/ui/ExercicioRespiracao';
import { ContatoConfianca, MAX_CONTATOS, lerContatos, salvarContatos } from '../../../lib/contatosConfianca';
import { styles } from './styleSOS';

const NUMERO_CVV = '188';
const CORES_AVATAR = ['#6C4CE0', '#4B32B0', '#2E9E6B', '#D08C2E', '#C2445C'];

function corAvatar(nome: string) {
  let soma = 0;
  for (let i = 0; i < nome.length; i += 1) soma += nome.charCodeAt(i);
  return CORES_AVATAR[soma % CORES_AVATAR.length];
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase() || 'SOS';
}

function apenasDigitos(telefone: string) {
  return telefone.replace(/\D/g, '');
}

/** Tenta extrair o nome da estrutura do contato */
function extrairNome(obj: any): string {
  if (!obj) return '';
  if (typeof obj.name === 'string' && obj.name.trim()) return obj.name.trim();
  if (typeof obj.displayName === 'string' && obj.displayName.trim()) return obj.displayName.trim();
  if (typeof obj.formattedName === 'string' && obj.formattedName.trim()) return obj.formattedName.trim();

  const partes = [obj.firstName || obj.givenName, obj.middleName, obj.lastName || obj.familyName]
    .filter((p) => typeof p === 'string' && p.trim())
    .map((p) => p.trim());

  if (partes.length > 0) return partes.join(' ');
  if (typeof obj.nickname === 'string' && obj.nickname.trim()) return obj.nickname.trim();
  return '';
}

/** Extrai o telefone do contato */
function extrairTelefone(obj: any): string | null {
  if (!obj) return null;

  if (Array.isArray(obj.phoneNumbers) && obj.phoneNumbers.length > 0) {
    for (const p of obj.phoneNumbers) {
      const num = p?.number || p?.digits || p?.value || p?.formattedNumber;
      if (num && String(num).trim()) return String(num).trim();
    }
  }

  if (Array.isArray(obj.phones) && obj.phones.length > 0) {
    for (const p of obj.phones) {
      const num = p?.number || p?.digits || p?.value;
      if (num && String(num).trim()) return String(num).trim();
    }
  }

  if (typeof obj.phoneNumber === 'string' && obj.phoneNumber.trim()) {
    return obj.phoneNumber.trim();
  }

  return null;
}

export default function SOS() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [respirandoAberto, setRespirandoAberto] = useState(false);
  const [contatos, setContatos] = useState<ContatoConfianca[]>([]);
  const [carregandoContatos, setCarregandoContatos] = useState(true);

  // Estados para o Modal de definição do Nome do Contato
  const [modalNomeVisivel, setModalNomeVisivel] = useState(false);
  const [nomeEditado, setNomeEditado] = useState('');
  const [telefonePendente, setTelefonePendente] = useState('');
  const [idPendente, setIdPendente] = useState('');

  useEffect(() => {
    lerContatos()
      .then(setContatos)
      .finally(() => setCarregandoContatos(false));
  }, []);

  const ligarPara = useCallback(async (numero: string) => {
    const url = `tel:${numero}`;
    try {
      const suportado = await Linking.canOpenURL(url);
      if (!suportado) {
        Alert.alert('Não foi possível ligar', 'Este dispositivo não suporta chamadas diretas.');
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Não foi possível ligar', 'Tente discar manualmente: ' + numero);
    }
  }, []);

  const abrirWhatsapp = useCallback(async (telefone: string) => {
    let numero = apenasDigitos(telefone);
    if (!numero) {
      Alert.alert('Número inválido', 'Esse contato não possui um telefone válido para WhatsApp.');
      return;
    }

    if (numero.length === 10 || numero.length === 11) {
      numero = `55${numero}`;
    }

    const url = `https://wa.me/${numero}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Não foi possível abrir o WhatsApp', 'Tente novamente em instantes.');
    }
  }, []);

  const abrirOpcoesContato = useCallback(
    (nome: string, telefone: string) => {
      Alert.alert(
        nome,
        'Como você deseja entrar em contato?',
        [
          {
            text: 'Conversar no WhatsApp',
            onPress: () => abrirWhatsapp(telefone),
          },
          {
            text: 'Fazer Ligação',
            onPress: () => ligarPara(telefone),
          },
          {
            text: 'Cancelar',
            style: 'cancel',
          },
        ]
      );
    },
    [abrirWhatsapp, ligarPara]
  );

  const adicionarContato = useCallback(async () => {
    if (contatos.length >= MAX_CONTATOS) {
      Alert.alert(
        'Limite de contatos',
        `Você pode ter até ${MAX_CONTATOS} pessoas de confiança. Remova alguma para adicionar outra.`
      );
      return;
    }
    try {
      // Checa a permissão
      let { status, canAskAgain } = await Contacts.getPermissionsAsync();

      if (status !== 'granted') {
        if (canAskAgain) {
          const resposta = await Contacts.requestPermissionsAsync();
          status = resposta.status;
        }
      }

      if (status !== 'granted') {
        Alert.alert(
          'Permissão de Contatos',
          'Precisamos de acesso aos contatos para adicionar pessoas de confiança. Deseja abrir as configurações para permitir?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Abrir Configurações',
              onPress: () => Linking.openSettings(),
            },
          ]
        );
        return;
      }

      // Abre o seletor nativo do aparelho
      let escolhido: any = null;
      if (Contacts.Contact && typeof Contacts.Contact.presentPicker === 'function') {
        escolhido = await Contacts.Contact.presentPicker();
      } else if (typeof (Contacts as any).presentPicker === 'function') {
        escolhido = await (Contacts as any).presentPicker();
      }

      if (!escolhido) return; // Cancelou

      // Tenta carregar detalhes se disponíveis
      let dadosDetalhados = escolhido;
      if (typeof escolhido.getDetails === 'function') {
        try {
          const det = await escolhido.getDetails();
          if (det) dadosDetalhados = det;
        } catch {}
      } else if (escolhido.id) {
        try {
          const detId = await Contacts.getContactByIdAsync(escolhido.id);
          if (detId) dadosDetalhados = { ...dadosDetalhados, ...detId };
        } catch {}
      }

      const telefone = extrairTelefone(dadosDetalhados);
      const nomeIdentificado = extrairNome(dadosDetalhados);

      if (!telefone) {
        Alert.alert(
          'Sem telefone salvo',
          'Esse contato não possui nenhum número de telefone salvo na agenda.'
        );
        return;
      }

      // Preenche os dados e abre a janelinha para confirmar o NOME
      setIdPendente(escolhido.id || `${Date.now()}`);
      setTelefonePendente(telefone);
      setNomeEditado(nomeIdentificado); // Se achou o nome, já deixa preenchido
      setModalNomeVisivel(true);
    } catch {
      console.warn('Erro ao selecionar contato.');
      Alert.alert('Atenção', 'Não foi possível selecionar o contato. Tente novamente.');
    }
  }, [contatos.length]);

  // Salva o contato com o nome que o usuário confirmou/digitou
  const salvarContatoConfirmado = useCallback(async () => {
    const nomeFinal = nomeEditado.trim();

    if (!nomeFinal) {
      Alert.alert('Digite um nome', 'Por favor, digite o nome dessa pessoa de confiança.');
      return;
    }

    const jaExiste = contatos.some(
      (c) => apenasDigitos(c.telefone) === apenasDigitos(telefonePendente)
    );

    if (jaExiste) {
      setModalNomeVisivel(false);
      Alert.alert('Contato já adicionado', 'Esse número já está na sua lista de SOS.');
      return;
    }

    const novoContato: ContatoConfianca = {
      id: idPendente || `${Date.now()}`,
      nome: nomeFinal,
      telefone: telefonePendente,
      papel: 'Contato de Confiança',
    };

    // Só mostra o contato na lista depois de gravado; se falhar, o modal fica aberto para tentar de novo.
    const atualizados = [...contatos, novoContato];
    if (!(await salvarContatos(atualizados))) {
      Alert.alert('Atenção', 'Não foi possível salvar o contato. Tente novamente.');
      return;
    }
    setContatos(atualizados);

    setModalNomeVisivel(false);

    // Abre opções de contato na hora
    abrirOpcoesContato(nomeFinal, telefonePendente);
  }, [nomeEditado, telefonePendente, idPendente, contatos, abrirOpcoesContato]);

  const removerContato = useCallback(
    (id: string, nome: string) => {
      Alert.alert('Remover contato?', `${nome} vai sair da sua lista de pessoas de confiança.`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            const atualizados = contatos.filter((c) => c.id !== id);
            if (!(await salvarContatos(atualizados))) {
              Alert.alert('Atenção', 'Não foi possível remover o contato. Tente novamente.');
              return;
            }
            setContatos(atualizados);
          },
        },
      ]);
    },
    [contatos],
  );

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.cartaoSeguranca, { backgroundColor: theme.colors.primary }]}>
        <View style={styles.cartaoSegurancaTituloLinha}>
          <Text style={[styles.cartaoSegurancaTitulo, { color: theme.colors.onPrimary }]}>
            Você está seguro aqui
          </Text>
          <Feather name="heart" size={22} color={theme.colors.onPrimary} />
        </View>
        <Text style={[styles.cartaoSegurancaSubtitulo, { color: theme.colors.onPrimary }]}>
          Se este for um momento difícil, existem pessoas e recursos que podem ajudar.
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.botaoPrincipal,
          { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
        ]}
        onPress={() => ligarPara(NUMERO_CVV)}
        accessibilityRole="button"
        accessibilityLabel="Ligar para o CVV"
      >
        <View style={[styles.botaoPrincipalIcone, { backgroundColor: theme.colors.onPrimary + '26' }]}>
          <Feather name="phone" size={26} color={theme.colors.onPrimary} />
        </View>
        <Text style={[styles.botaoPrincipalTitulo, { color: theme.colors.onPrimary }]}>
          Preciso conversar com alguém
        </Text>
        <Text style={[styles.botaoPrincipalSubtitulo, { color: theme.colors.onPrimary }]}>
          Toque aqui para ligar para o CVV
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkSecundario}
        onPress={() =>
          Linking.openURL('https://www.cvv.org.br/chat/').catch(() =>
            Alert.alert('Não foi possível abrir o chat', 'Acesse cvv.org.br/chat no navegador.'),
          )
        }
        accessibilityRole="button"
        accessibilityLabel="Abrir chat do CVV"
      >
        <Feather name="message-square" size={16} color={theme.colors.primary} />
        <Text style={[styles.linkSecundarioTexto, { color: theme.colors.primary }]}>
          Prefiro conversar por chat com o CVV
        </Text>
      </TouchableOpacity>

      <View style={styles.secaoTituloLinha}>
        <Feather name="heart" size={18} color={theme.colors.primary} />
        <Text style={[styles.secaoTitulo, { color: theme.colors.onBackground }]}>
          Pessoas que podem ajudar
        </Text>
      </View>

      {/* CVV 188 Fixo */}
      <TouchableOpacity
        style={[styles.linhaContato, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
        onPress={() => ligarPara(NUMERO_CVV)}
        accessibilityRole="button"
        accessibilityLabel="Ligar para o CVV 188"
      >
        <View style={[styles.contatoIconeCirculo, { backgroundColor: theme.colors.onPrimary + '26' }]}>
          <Feather name="phone-call" size={20} color={theme.colors.onPrimary} />
        </View>
        <View style={styles.contatoInformacao}>
          <Text style={[styles.contatoNome, { color: theme.colors.onPrimary }]}>CVV 188</Text>
          <Text style={[styles.contatoPapel, { color: theme.colors.onPrimary }]}>
            Apoio emocional 24h
          </Text>
        </View>
        <Feather name="phone" size={20} color={theme.colors.onPrimary} />
      </TouchableOpacity>

      {/* Lista de Contatos de Confiança com o Nome Correto */}
      {!carregandoContatos &&
        contatos.map((contato) => (
          <TouchableOpacity
            key={contato.id}
            style={[styles.linhaContato, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
            onPress={() => abrirOpcoesContato(contato.nome, contato.telefone)}
            activeOpacity={0.7}
          >
            <View style={[styles.avatar, { backgroundColor: corAvatar(contato.nome) }]}>
              <Text style={styles.avatarTexto}>{iniciais(contato.nome)}</Text>
            </View>

            <View style={styles.contatoInformacao}>
              <Text style={[styles.contatoNome, { color: theme.colors.onSurface }]}>
                {contato.nome}
              </Text>
              <Text style={[styles.contatoPapel, { color: theme.colors.onSurfaceVariant }]}>
                {contato.papel}
              </Text>
            </View>

            <View style={styles.contatoAcoes}>
              <TouchableOpacity
                style={[styles.contatoBotaoAcao, { backgroundColor: theme.colors.primaryContainer }]}
                hitSlop={4}
                onPress={() => abrirWhatsapp(contato.telefone)}
                accessibilityRole="button"
                accessibilityLabel={`Chamar ${contato.nome} no WhatsApp`}
              >
                <Feather name="message-circle" size={18} color={theme.colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.contatoBotaoAcao, { backgroundColor: theme.colors.primaryContainer }]}
                hitSlop={4}
                onPress={() => ligarPara(contato.telefone)}
                accessibilityRole="button"
                accessibilityLabel={`Ligar para ${contato.nome}`}
              >
                <Feather name="phone" size={18} color={theme.colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.contatoBotaoAcao}
                hitSlop={4}
                onPress={() => removerContato(contato.id, contato.nome)}
                accessibilityRole="button"
                accessibilityLabel={`Remover ${contato.nome}`}
              >
                <Feather name="x" size={18} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

      <TouchableOpacity
        style={[styles.botaoAdicionar, { borderColor: theme.colors.outline }]}
        onPress={adicionarContato}
        accessibilityRole="button"
        accessibilityLabel="Adicionar pessoa de confiança"
      >
        <Feather name="user-plus" size={18} color={theme.colors.primary} />
        <Text style={[styles.botaoAdicionarTexto, { color: theme.colors.primary }]}>
          Adicionar pessoa de confiança
        </Text>
      </TouchableOpacity>

      <View style={[styles.exercicioCard, { backgroundColor: theme.colors.primaryContainer }]}>
        <Feather name="wind" size={32} color={theme.colors.primary} />
        <Text style={[styles.exercicioTitulo, { color: theme.colors.onPrimaryContainer }]}>
          Precisa se acalmar?
        </Text>
        <Text style={[styles.exercicioDescricao, { color: theme.colors.onPrimaryContainer }]}>
          Vamos fazer um exercício rápido de respiração guiada de 1 minuto.
        </Text>
        <TouchableOpacity
          style={[styles.exercicioBotao, { backgroundColor: theme.colors.primary }]}
          onPress={() => setRespirandoAberto(true)}
          accessibilityRole="button"
        >
          <Text style={[styles.exercicioBotaoTexto, { color: theme.colors.onPrimary }]}>
            Começar Exercício
          </Text>
        </TouchableOpacity>
      </View>

      <ExercicioRespiracao visivel={respirandoAberto} aoFechar={() => setRespirandoAberto(false)} />

      {/* MODAL PARA DEFINIR/CONFIRMAR O NOME DA PESSOA */}
      {/* Só a status bar translúcida: com a barra de navegação também, o Android para de
          redimensionar a janela para o teclado e ele cobriria o campo e o Salvar. */}
      <Modal
        visible={modalNomeVisivel}
        transparent
        animationType="fade"
        onRequestClose={() => setModalNomeVisivel(false)}
        statusBarTranslucent
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <View
            style={{
              width: '100%',
              backgroundColor: theme.colors.surface,
              borderRadius: 20,
              padding: 24,
              borderWidth: 1,
              borderColor: theme.colors.outline,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: theme.colors.onSurface,
                marginBottom: 8,
              }}
            >
              Nome da Pessoa de Confiança
            </Text>

            <Text
              style={{
                fontSize: 14,
                color: theme.colors.onSurfaceVariant,
                marginBottom: 16,
              }}
            >
              Telefone selecionado: {telefonePendente}
            </Text>

            <TextInput
              style={{
                borderWidth: 1,
                borderColor: theme.colors.outline,
                borderRadius: 12,
                paddingHorizontal: 16,
                height: 48,
                fontSize: 16,
                color: theme.colors.onSurface,
                backgroundColor: theme.colors.background,
                marginBottom: 20,
              }}
              placeholder="Ex: Mãe, Carlos, Dra. Ana..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={nomeEditado}
              onChangeText={setNomeEditado}
              autoFocus
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.colors.outline,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={() => setModalNomeVisivel(false)}
              >
                <Text style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 12,
                  backgroundColor: theme.colors.primary,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={salvarContatoConfirmado}
              >
                <Text style={{ color: theme.colors.onPrimary, fontWeight: 'bold' }}>
                  Salvar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}