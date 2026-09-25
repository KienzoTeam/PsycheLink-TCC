import React, { useState } from 'react';
import { Modal, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeContext';
import { styles } from '../../screens/paciente/BemEstar/StyleBemEstar';
import { MOOD_OPTIONS } from '../../constants/data';

interface MoodModalProps {
  visible: boolean;
  onClose: () => void;
  onRegister: (mood: string) => void;
}

export function MoodModal({ visible, onClose, onRegister }: MoodModalProps) {
  const { theme } = useTheme();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

 
  const handleClose = () => {
    setSelectedMood(null);
    onClose();
  };

  const handleRegister = () => {
    if (!selectedMood) {
      return;
    }

    onRegister(selectedMood);
    setSelectedMood(null);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.moodOverlay}>
        <SafeAreaView
          style={[styles.moodSheet, { backgroundColor: theme.colors.surfaceContainer }]}
        >
          <View style={styles.moodHandle} />

          <TouchableOpacity style={styles.moodCloseButton} onPress={handleClose}>
            <Feather name="x" size={21} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>

          <View style={[styles.successIcon, { backgroundColor: theme.colors.primaryContainer }]}>
            <Feather name="check" size={28} color={theme.colors.primary} />
          </View>

          <Text style={[styles.moodTitle, { color: theme.colors.onSurface }]}>
            Como você se sente agora?
          </Text>

          <Text style={[styles.moodSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            Observe como você está após este momento de autocuidado.
          </Text>

          <View style={styles.moodOptions}>
            {MOOD_OPTIONS.map((option) => {
              const selected = selectedMood === option.value;

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.moodOption,
                    {
                      backgroundColor: selected
                        ? theme.colors.primaryContainer
                        : theme.colors.background,
                      borderColor: selected ? theme.colors.primary : theme.colors.outline,
                    },
                  ]}
                  onPress={() => setSelectedMood(option.value)}
                >
                  <Text style={styles.moodEmoji}>{option.emoji}</Text>

                  <Text
                    style={[
                      styles.moodOptionText,
                      { color: selected ? theme.colors.primary : theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View
            style={[styles.privacyCard, { backgroundColor: theme.colors.secondaryContainer }]}
          >
            <Feather name="lock" size={17} color={theme.colors.secondary} />

            <Text style={[styles.privacyText, { color: theme.colors.onSecondaryContainer }]}>
              Este registro não será compartilhado automaticamente com seu psicólogo.
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.primaryAction,
              { backgroundColor: theme.colors.primary, opacity: selectedMood ? 1 : 0.5 },
            ]}
            disabled={!selectedMood}
            onPress={handleRegister}
          >
            <Feather name="book-open" size={18} color={theme.colors.onPrimary} />

            <Text style={[styles.primaryActionText, { color: theme.colors.onPrimary }]}>
              Registrar no diário
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.notNowButton} onPress={handleClose}>
            <Text style={[styles.notNowText, { color: theme.colors.onSurfaceVariant }]}>
              Agora não
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export default MoodModal;
