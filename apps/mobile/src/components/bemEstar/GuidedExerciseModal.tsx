import React from 'react';
import { Alert, Modal, SafeAreaView, ScrollView, Text, TouchableOpacity, View,} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeContext';
import { styles } from '../../screens/paciente/BemEstar/StyleBemEstar';
import { Exercise } from '../../constants/types';
import { formatTime } from '../../lib/utils';
import { useGuidedExerciseTimer } from '../../hooks/useGuidedExerciseTimer';
import { BreathingCircle } from './BreathingCircle';

interface GuidedExerciseModalProps {
  visible: boolean;
  exercise: Exercise | null;
  onClose: () => void;
  onComplete: () => void;
}

export function GuidedExerciseModal({
  visible,
  exercise,
  onClose,
  onComplete,
}: GuidedExerciseModalProps) {
  const { theme } = useTheme();

  const {
    status,
    remainingSeconds,
    activeStepIndex,
    breathingPhase,
    toggle,
  } = useGuidedExerciseTimer({ visible, exercise, onComplete });

  if (!exercise) {
    return null;
  }

  const currentStep = exercise.steps[activeStepIndex] ?? exercise.steps[0];

  const requestClose = () => {
    // Se o usuário estiver no meio de um exercício, confirma antes de
    // descartar o progresso — evita fechar sem querer.
    if (status === 'running' || status === 'paused') {
      Alert.alert(
        'Encerrar exercício?',
        'Seu progresso nesta sessão será perdido.',
        [
          { text: 'Continuar exercício', style: 'cancel' },
          { text: 'Encerrar', style: 'destructive', onPress: onClose },
        ],
      );
      return;
    }

    onClose();
  };

  const primaryButtonLabel =
    status === 'running' ? 'Pausar' : status === 'paused' ? 'Continuar' : 'Iniciar';

  const centerTitle =
    status === 'idle' ? 'Prepare-se' : status === 'paused' ? 'Pausado' : breathingPhase.title;

  const centerDescription =
    status === 'idle'
      ? 'Inicie quando se sentir confortável'
      : status === 'paused'
        ? 'Continue quando estiver preparado'
        : exercise.type === 'breathing'
          ? breathingPhase.description
          : currentStep;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={requestClose}>
      <View style={styles.modalOverlay}>
        <SafeAreaView
          style={[styles.guidedModal, { backgroundColor: theme.colors.surfaceContainer }]}
        >
          <View style={styles.guidedModalHeader}>
            <View style={styles.modalHeaderSpacer} />

            <View style={styles.modalHeaderText}>
              <Text
                style={[styles.guidedModalTitle, { color: theme.colors.onSurface }]}
                maxFontSizeMultiplier={1.2}
              >
                {exercise.title}
              </Text>

              <Text
                style={[
                  styles.guidedModalSubtitle,
                  { color: theme.colors.onSurfaceVariant },
                ]}
                maxFontSizeMultiplier={1.2}
              >
                {exercise.id === 'breathing-one-minute'
                  ? 'Por 1 minuto, acalme a mente'
                  : exercise.description}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={requestClose}
              accessibilityRole="button"
              accessibilityLabel="Fechar exercício"
            >
              <Feather name="x" size={22} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.guidedModalScroll}
            contentContainerStyle={styles.guidedModalContent}
            showsVerticalScrollIndicator={false}
          >
            {exercise.type === 'breathing' ? (
              <>
                <View style={styles.breathingStage}>
                  <BreathingCircle status={status} phaseTitle={centerTitle} />
                </View>

                <Text
                  style={[
                    styles.breathingPhaseDescription,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                  maxFontSizeMultiplier={1.2}
                >
                  {centerDescription}
                </Text>
              </>
            ) : (
              <View
                style={[styles.guidanceCard, { backgroundColor: theme.colors.primaryContainer }]}
              >
                <View
                  style={[
                    styles.guidanceIcon,
                    { backgroundColor: theme.colors.surfaceContainer },
                  ]}
                >
                  <Feather name={exercise.icon} size={28} color={theme.colors.primary} />
                </View>

                <Text
                  style={[styles.guidanceText, { color: theme.colors.onPrimaryContainer }]}
                  maxFontSizeMultiplier={1.25}
                >
                  {centerDescription}
                </Text>
              </View>
            )}

            <View
              style={[
                styles.timerCard,
                { backgroundColor: theme.colors.background, borderColor: theme.colors.outline },
              ]}
            >
              <Text
                style={[styles.timerText, { color: theme.colors.primary }]}
                maxFontSizeMultiplier={1.1}
              >
                {formatTime(remainingSeconds)}
              </Text>

              <Text
                style={[styles.timerDescription, { color: theme.colors.onSurfaceVariant }]}
                maxFontSizeMultiplier={1.2}
              >
                {status === 'running'
                  ? 'Ciclo automático — siga o seu ritmo'
                  : status === 'paused'
                    ? 'Exercício pausado'
                    : `Duração: ${exercise.durationLabel}`}
              </Text>
            </View>

            <View style={[styles.stepsContainer, { backgroundColor: theme.colors.background }]}>
              {exercise.steps.map((step, index) => {
                const active = index === activeStepIndex;

                return (
                  <View key={`${exercise.id}-${index}`} style={styles.stepRow}>
                    <View
                      style={[
                        styles.stepNumber,
                        {
                          backgroundColor: active
                            ? theme.colors.primary
                            : theme.colors.primaryContainer,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.stepNumberText,
                          { color: active ? theme.colors.onPrimary : theme.colors.primary },
                        ]}
                      >
                        {index + 1}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.stepText,
                        {
                          color: active
                            ? theme.colors.onSurface
                            : theme.colors.onSurfaceVariant,
                          fontWeight: active ? '700' : '500',
                        },
                      ]}
                      maxFontSizeMultiplier={1.2}
                    >
                      {step}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.guidedModalActions}>
            <TouchableOpacity
              style={[styles.primaryAction, { backgroundColor: theme.colors.primary }]}
              onPress={toggle}
              activeOpacity={0.85}
            >
              <Feather
                name={status === 'running' ? 'pause' : 'play'}
                size={18}
                color={theme.colors.onPrimary}
              />

              <Text
                style={[styles.primaryActionText, { color: theme.colors.onPrimary }]}
                maxFontSizeMultiplier={1.15}
              >
                {primaryButtonLabel}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryAction,
                { borderColor: theme.colors.primary, backgroundColor: theme.colors.surfaceContainer },
              ]}
              onPress={requestClose}
              activeOpacity={0.85}
            >
              <Text
                style={[styles.secondaryActionText, { color: theme.colors.primary }]}
                maxFontSizeMultiplier={1.15}
              >
                Encerrar
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.finishAction}
            onPress={onComplete}
            accessibilityRole="button"
          >
            <Text style={[styles.finishActionText, { color: theme.colors.onSurfaceVariant }]}>
              Finalizar agora
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export default GuidedExerciseModal;
