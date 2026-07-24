import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { styles } from './styleChat';

const mensagens = [
  { id: '1', texto: 'Olá, Júlia! Como você está se sentindo hoje?', de: 'medico' },
  { id: '2', texto: 'Oi, Dr. Marcos! Hoje estou me sentindo um pouco mais calma do que ontem.', de: 'eu' },
  { id: '3', texto: 'Que bom saber disso. O exercício de respiração que fizemos na última sessão ajudou?', de: 'medico' },
  { id: '4', texto: 'Ajudou sim, usei ele antes de começar a trabalhar.', de: 'eu' },
];

export default function Chat() {
  const { theme, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header do Chat */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.outline }]}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.avatarText}>M</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.doctorName, { color: theme.colors.onSurface }]}>Dr. Marcos Silva</Text>
          <Text style={[styles.doctorStatus, { color: theme.colors.onSurfaceVariant }]}>Online</Text>
        </View>
        <TouchableOpacity>
          <Feather name="video" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Lista de Mensagens */}
      <ScrollView style={styles.chatContent} contentContainerStyle={{ paddingTop: 20 }}>
        {mensagens.map((msg) => {
          const isEu = msg.de === 'eu';
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
      <View style={[styles.inputArea, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outline }]}>
        <TextInput 
          style={[styles.textInput, { backgroundColor: isDark ? theme.colors.surfaceVariant : theme.colors.background, color: theme.colors.onSurface }]}
          placeholder="Digite uma mensagem..."
          placeholderTextColor={theme.colors.onSurfaceVariant}
        />
        <TouchableOpacity style={[styles.sendButton, { backgroundColor: theme.colors.primary }]}>
          <Feather name="send" size={18} color={theme.colors.onPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
