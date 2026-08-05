import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import CustomButton from '../../../components/ui/CustomButton';
import { styles } from './styleCheckin';

const humores = [
  { id: 1, emoji: '😫', label: 'Muito mal' },
  { id: 2, emoji: '😕', label: 'Mal' },
  { id: 3, emoji: '😐', label: 'Neutro' },
  { id: 4, emoji: '🙂', label: 'Bem' },
  { id: 5, emoji: '🤩', label: 'Muito bem' },
];

const emocoesTags = [
  'Ansioso', 'Calmo', 'Feliz', 'Triste', 'Cansado', 
  'Energético', 'Estressado', 'Produtivo', 'Inspirado', 'Solitário'
];

export default function Checkin() {
  const { theme, isDark } = useTheme();
  const [humorSelecionado, setHumorSelecionado] = useState<number | null>(null);
  const [tagsSelecionadas, setTagsSelecionadas] = useState<string[]>([]);
  const [notas, setNotas] = useState('');

  const toggleTag = (tag: string) => {
    if (tagsSelecionadas.includes(tag)) {
      setTagsSelecionadas(tagsSelecionadas.filter(t => t !== tag));
    } else {
      setTagsSelecionadas([...tagsSelecionadas, tag]);
    }
  };

  const handleSalvar = () => {
    if (humorSelecionado === null) {
      Alert.alert('Quase lá!', 'Por favor, selecione como você está se sentindo.');
      return;
    }
    Alert.alert('Sucesso', 'Seu check-in foi registrado com carinho! ✨');
  };

  return (
    <ScrollView 
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.onBackground }]}>Check-in diário</Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Tire um momento para refletir sobre o seu dia. Como você se sente agora?
        </Text>
      </View>

      {/* Seção 1: Humor */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Humor</Text>
        <View style={[styles.humorGrid, { backgroundColor: isDark ? theme.colors.surface : theme.colors.surfaceVariant }]}>
          {humores.map((h) => (
            <TouchableOpacity 
              key={h.id}
              style={[
                styles.humorItem,
                humorSelecionado === h.id && { backgroundColor: theme.colors.primary }
              ]}
              onPress={() => setHumorSelecionado(h.id)}
            >
              <Text style={styles.humorEmoji}>{h.emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Seção 2: Emoções */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>O que descreve seu sentimento?</Text>
        <View style={styles.tagsContainer}>
          {emocoesTags.map((tag) => {
            const selecionada = tagsSelecionadas.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                onPress={() => toggleTag(tag)}
                style={[
                  styles.tag,
                  { 
                    borderColor: selecionada ? theme.colors.primary : theme.colors.outline,
                    backgroundColor: selecionada ? theme.colors.primaryContainer : 'transparent'
                  }
                ]}
              >
                <Text style={[
                  styles.tagText,
                  { color: selecionada ? theme.colors.primary : theme.colors.onSurfaceVariant }
                ]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Seção 3: Notas */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Quer escrever algo?</Text>
        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: isDark ? theme.colors.surface : '#fff',
              borderColor: theme.colors.outline,
              color: theme.colors.onSurface,
              borderRadius: theme.borderRadius.md
            }
          ]}
          placeholder="Opcional: Descreva brevemente o que aconteceu hoje..."
          placeholderTextColor={theme.colors.onSurfaceVariant}
          multiline
          numberOfLines={4}
          value={notas}
          onChangeText={setNotas}
        />
      </View>

      <View style={styles.footer}>
        <CustomButton 
          title="Salvar Registro" 
          onPress={handleSalvar}
        />
      </View>
    </ScrollView>
  );
}
