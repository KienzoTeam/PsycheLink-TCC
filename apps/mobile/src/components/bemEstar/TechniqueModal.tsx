import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { styles } from '../../screens/paciente/BemEstar/StyleBemEstar';
import { TECHNIQUE_STEPS } from '../../constants/data';

interface TechniqueModalProps {
  visible: boolean;
  completedSteps: number[];
  onToggleStep: (stepNumber: number) => void;
  onClose: () => void;
  onComplete: () => void;
}

export function TechniqueModal({
  visible,
  completedSteps,
  onToggleStep,
  onClose,
  onComplete,
}: TechniqueModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const allStepsCompleted = completedSteps.length === TECHNIQUE_STEPS.length;

  // Translúcido nas duas barras: sem isso, no Android a tela de trás aparece na
  // status bar. Os insets afastam o cartão das barras.
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View
        style={[
          styles.modalOverlay,
          { paddingTop: 22 + insets.top, paddingBottom: 22 + insets.bottom },
        ]}
      >
        <View style={[styles.techniqueModal, { backgroundColor: theme.colors.surfaceContainer }]}>
          <View style={styles.guidedModalHeader}>
            <View style={styles.modalHeaderSpacer} />

            {/* Mesmo wrapper flex do GuidedExerciseModal: centraliza o título e empurra o X para o canto. */}
            <View style={styles.modalHeaderText}>
              <Text
                style={[styles.guidedModalTitle, { color: theme.colors.onSurface }]}
                maxFontSizeMultiplier={1.2}
              >
                Técnica 5-4-3-2-1
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={onClose}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Fechar técnica"
            >
              <Feather name="x" size={22} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.techniqueScroll}
            contentContainerStyle={styles.techniqueContent}
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={[styles.techniqueIntroduction, { color: theme.colors.onSurfaceVariant }]}
            >
              Use esta técnica quando precisar se reconectar com o presente:
            </Text>

            <View style={styles.techniqueList}>
              {TECHNIQUE_STEPS.map((step) => {
                const completed = completedSteps.includes(step.number);

                return (
                  <TouchableOpacity
                    key={step.number}
                    style={[
                      styles.techniqueStep,
                      {
                        backgroundColor: completed
                          ? theme.colors.primaryContainer
                          : theme.colors.background,
                        borderColor: completed ? theme.colors.primary : theme.colors.outline,
                      },
                    ]}
                    onPress={() => onToggleStep(step.number)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.techniqueNumber,
                        {
                          backgroundColor: completed
                            ? theme.colors.primary
                            : theme.colors.surfaceContainer,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.techniqueNumberText,
                          { color: completed ? theme.colors.onPrimary : theme.colors.primary },
                        ]}
                      >
                        {step.number}
                      </Text>
                    </View>

                    <View style={styles.techniqueStepInformation}>
                      <Text
                        style={[styles.techniqueStepTitle, { color: theme.colors.onSurface }]}
                      >
                        {step.title}
                      </Text>

                      <Text
                        style={[
                          styles.techniqueStepDescription,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                      >
                        {step.description}
                      </Text>
                    </View>

                    <Feather
                      name={completed ? 'check-circle' : step.icon}
                      size={20}
                      color={completed ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            <View
              style={[styles.encouragementCard, { backgroundColor: theme.colors.primaryContainer }]}
            >
              <Text style={styles.encouragementEmoji}>💜</Text>

              <Text
                style={[styles.encouragementText, { color: theme.colors.onPrimaryContainer }]}
              >
                Cuidar de você é um ato de coragem e amor próprio.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.techniqueActions}>
            <TouchableOpacity
              style={[
                styles.primaryAction,
                { backgroundColor: theme.colors.primary, opacity: allStepsCompleted ? 1 : 0.5 },
              ]}
              disabled={!allStepsCompleted}
              onPress={onComplete}
            >
              <Feather name="check" size={18} color={theme.colors.onPrimary} />

              <Text style={[styles.primaryActionText, { color: theme.colors.onPrimary }]}>
                Concluir técnica
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default TechniqueModal;
