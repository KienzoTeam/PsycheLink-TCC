import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, Linking, ScrollViewInstance } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { alertarDemonstracao } from '../../../lib/prototipo';
import SeloDemonstracao from '../../../components/ui/SeloDemonstracao';
import { styles } from './styleChat';

type Mensagem = {
  id: string;
  texto: string;
  de: 'eu' | 'medico' | 'sistema';
};

const mensagensIniciais: Mensagem[] = [
  { id: '1', texto: 'Olá! Como você está se sentindo hoje?', de: 'medico' },
  { id: '2', texto: 'Oi! Hoje estou me sentindo um pouco mais calma do que ontem.', de: 'eu' },
  { id: '3', texto: 'Que bom saber disso. O exercício de respiração que fizemos na última sessão ajudou?', de: 'medico' },
  { id: '4', texto: 'Ajudou sim, usei ele antes de começar a trabalhar.', de: 'eu' },
];

export default function Chat() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const listaRef = useRef<ScrollViewInstance>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>(mensagensIniciais);
  const [rascunho, setRascunho] = useState('');

  // Mensagem nova nasce visível: acompanha o fim da lista em conteúdo/montagem.
  const acompanharFim = () => listaRef.current?.scrollToEnd({ animated: true });

  const handleEnviar = () => {
    const texto = rascunho.trim();
    if (!texto) return;

    setMensagens(atual => [
      ...atual,
      { id: `${Date.now()}`, texto, de: 'eu' },
      // Uma única vez, com acolhimento primeiro e arquitetura depois.
      ...(atual.some(m => m.de === 'sistema')
        ? []
        : [{
            id: 'aviso-prototipo',
            texto: 'Recebido com carinho. Nesta demonstração seu psicólogo não recebe mensagens: o que você escreveu fica salvo apenas no seu aparelho.',
            de: 'sistema' as const,
          }]),
    ]);
    setRascunho('');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header do Chat */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.outline }]}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
          <Feather name="user" size={20} color={theme.colors.onPrimary} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.doctorName, { color: theme.colors.onSurface }]}>Seu psicólogo</Text>
          <Text style={[styles.doctorStatus, { color: theme.colors.onSurfaceVariant }]}>modo demonstração</Text>
        </View>
        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              'Precisa falar com alguém agora?',
              'O CVV atende de graça, 24 horas por dia.',
              [
                // Sem o catch, aparelho sem telefonia (ou sem navegador) não dava retorno nenhum.
                {
                  text: 'Ligar 188',
                  onPress: () =>
                    Linking.openURL('tel:188').catch(() =>
                      Alert.alert('Não foi possível ligar', 'Disque 188 no seu telefone.'),
                    ),
                },
                {
                  text: 'Abrir chat',
                  onPress: () =>
                    Linking.openURL('https://www.cvv.org.br/chat/').catch(() =>
                      Alert.alert('Não foi possível abrir o chat', 'Acesse cvv.org.br/chat no navegador.'),
                    ),
                },
                { text: 'Fechar', style: 'cancel' },
              ]
            )
          }
          hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
          style={styles.headerBotao}
          accessibilityRole="button"
          accessibilityLabel="Em crise? Falar agora com o CVV"
        >
          <Feather name="alert-circle" size={20} color={theme.colors.error} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => alertarDemonstracao()}
          hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
          style={styles.headerBotao}
          accessibilityRole="button"
          accessibilityLabel="Iniciar videochamada"
        >
          <Feather name="video" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Lista de Mensagens */}
      <ScrollView
        ref={listaRef}
        style={styles.chatContent}
        contentContainerStyle={{ paddingTop: 20 }}
        onContentSizeChange={acompanharFim}
        onLayout={acompanharFim}
      >
        <SeloDemonstracao />
        {mensagens.map((msg) => {
          const isEu = msg.de === 'eu';

          if (msg.de === 'sistema') {
            return (
              <Text key={msg.id} style={[styles.mensagemSistema, { color: theme.colors.onSurfaceVariant }]}>
                {msg.texto}
              </Text>
            );
          }

          return (
            <View key={msg.id} style={[styles.messageRow, isEu && styles.myMessageRow]}>
              <View style={[
                styles.messageBubble,
                isEu ? [styles.myBubble, { backgroundColor: theme.colors.primary }] 
                     : [styles.otherBubble, { backgroundColor: theme.colors.surface }]
              ]}>
                <Text style={[
                  styles.messageText, 
                  { color: isEu ? theme.colors.onPrimary : theme.colors.onSurface }
                ]}>
                  {msg.texto}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Área de Input */}
      <View style={[styles.inputArea, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outline, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TextInput 
          style={[styles.textInput, { backgroundColor: theme.colors.surfaceContainer, color: theme.colors.onSurface }]}
          placeholder="Digite uma mensagem..."
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={rascunho}
          onChangeText={setRascunho}
          onSubmitEditing={handleEnviar}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleEnviar}
          accessibilityRole="button"
          accessibilityLabel="Enviar mensagem"
        >
          <Feather name="send" size={18} color={theme.colors.onPrimary} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
