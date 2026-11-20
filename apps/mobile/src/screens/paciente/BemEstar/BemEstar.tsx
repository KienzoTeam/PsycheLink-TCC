import React, { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useTheme } from '../../../theme/ThemeContext';
import { styles } from './StyleBemEstar';
import { GUIDED_EXERCISES, QUICK_EXERCISES } from '../../../constants/data';
import { Exercise, MoodEntry } from '../../../constants/types';

import { ScreenHeader } from '../../../components/bemEstar/ScreenHeader';
import { DailyTipCard } from '../../../components/bemEstar/DailyTipCard';
import { ExerciseCard } from '../../../components/bemEstar/ExerciseCard';
import { GuidedExerciseModal } from '../../../components/bemEstar/GuidedExerciseModal';
import { TechniqueModal } from '../../../components/bemEstar/TechniqueModal';
import { MoodModal } from '../../../components/bemEstar/MoodModal';
import { RecomendacoesDoPsicologo } from '../../../components/bemEstar/RecomendacoesDoPsicologo';
import { useRecomendacoes } from '../../../hooks/useRecomendacoes';

interface BemEstarProps {
  onVoltar: () => void;
  /** A aba está na tela: as recomendações recarregam a cada vez que ela fica ativa. */
  ativa: boolean;

  // Mantidos apenas no histórico local do aplicativo. - Futura Integração com a api, sendo chamada por um outro hook.
  onRegistrarHumor?: (entry: MoodEntry) => void;
}

export default function BemEstar({ onVoltar, ativa, onRegistrarHumor }: BemEstarProps) {
  const { theme } = useTheme();
  const recomendacoes = useRecomendacoes(ativa);

  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [techniqueModalVisible, setTechniqueModalVisible] = useState(false);
  const [moodModalVisible, setMoodModalVisible] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [pendingMoodSource, setPendingMoodSource] = useState<{
    source: MoodEntry['source'];
    sourceId: string;
  } | null>(null);
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);

  const openExercise = useCallback((exercise: Exercise) => {
    setSelectedExercise(exercise);
    setExerciseModalVisible(true);
  }, []);

  const closeExercise = useCallback(() => {
    setExerciseModalVisible(false);
  }, []);

  const completeExercise = useCallback(() => {
    setExerciseModalVisible(false);

    if (selectedExercise) {
      setPendingMoodSource({ source: 'exercise', sourceId: selectedExercise.id });
    }

    setTimeout(() => setMoodModalVisible(true), 200);
  }, [selectedExercise]);

  const openTechnique = useCallback(() => {
    setCompletedSteps([]);
    setTechniqueModalVisible(true);
  }, []);

  const closeTechnique = useCallback(() => {
    setTechniqueModalVisible(false);
  }, []);

  const toggleTechniqueStep = useCallback((stepNumber: number) => {
    setCompletedSteps((currentSteps) =>
      currentSteps.includes(stepNumber)
        ? currentSteps.filter((current) => current !== stepNumber)
        : [...currentSteps, stepNumber],
    );
  }, []);

  const completeTechnique = useCallback(() => {
    setTechniqueModalVisible(false);
    setPendingMoodSource({ source: 'technique', sourceId: 'grounding-5-4-3-2-1' });
    setTimeout(() => setMoodModalVisible(true), 200);
  }, []);

  const closeMoodModal = useCallback(() => {
    setMoodModalVisible(false);
    setPendingMoodSource(null);
  }, []);

  const registerMood = useCallback(
    (mood: string) => {
      if (!pendingMoodSource) {
        setMoodModalVisible(false);
        return;
      }

      const entry: MoodEntry = {
        mood,
        source: pendingMoodSource.source,
        sourceId: pendingMoodSource.sourceId,
        registeredAt: new Date().toISOString(),
      };

      // Futura integração com a API
      setMoodHistory((current) => [...current, entry]);
      onRegistrarHumor?.(entry);

      setMoodModalVisible(false);
      setPendingMoodSource(null);
    },
    [pendingMoodSource, onRegistrarHumor],
  );

  // SafeAreaView do safe-area-context: o do react-native não afasta o cabeçalho da status bar
  // no Android. Só o topo: embaixo quem cuida do inset é a barra de abas.
  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <ScreenHeader title="Bem-estar" onBack={onVoltar} />

      <ScrollView
        style={styles.screenScroll}
        contentContainerStyle={styles.screenContent}
        showsVerticalScrollIndicator={false}
      >
        <RecomendacoesDoPsicologo
          recomendacoes={recomendacoes.lista}
          erro={recomendacoes.erro}
          onTentarDeNovo={recomendacoes.carregar}
          onAbrirExercicio={openExercise}
          onMarcarFeita={recomendacoes.marcarFeita}
        />

        <DailyTipCard tip="“Descansar faz parte do processo.”" />

        <View style={styles.sectionHeader}>
          <Feather name="heart" size={20} color={theme.colors.primary} />

          <Text
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
            maxFontSizeMultiplier={1.2}
          >
            Cuidar de mim agora
          </Text>
        </View>

        <View style={styles.exerciseGrid}>
          <ExerciseCard
            title={QUICK_EXERCISES[0].title}
            description={QUICK_EXERCISES[0].description}
            icon={QUICK_EXERCISES[0].icon}
            variant="primary"
            onPress={() => openExercise(QUICK_EXERCISES[0])}
          />

          <ExerciseCard
            title={QUICK_EXERCISES[1].title}
            description={QUICK_EXERCISES[1].description}
            icon={QUICK_EXERCISES[1].icon}
            variant="secondary"
            onPress={() => openExercise(QUICK_EXERCISES[1])}
          />

          <ExerciseCard
            title={QUICK_EXERCISES[2].title}
            description={QUICK_EXERCISES[2].description}
            icon={QUICK_EXERCISES[2].icon}
            variant="tertiary"
            onPress={() => openExercise(QUICK_EXERCISES[2])}
          />

          <ExerciseCard
            title="Técnica 5-4-3-2-1"
            description="Reconecte-se com seus sentidos"
            icon="anchor"
            variant="primary"
            onPress={openTechnique}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Feather name="activity" size={20} color={theme.colors.primary} />

          <Text
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
            maxFontSizeMultiplier={1.2}
          >
            Exercícios guiados
          </Text>
        </View>

        <View style={styles.guidedList}>
          {GUIDED_EXERCISES.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              title={exercise.title}
              description={exercise.description}
              icon={exercise.icon}
              duration={exercise.durationLabel}
              compact
              onPress={() => openExercise(exercise)}
            />
          ))}
        </View>

        <View style={[styles.supportCard, { backgroundColor: theme.colors.secondaryContainer }]}>
          <Feather name="heart" size={18} color={theme.colors.secondary} />

          <Text style={[styles.supportText, { color: theme.colors.onSecondaryContainer }]}>
            Escolha o exercício que fizer sentido para você agora.
          </Text>
        </View>
      </ScrollView>

      <GuidedExerciseModal
        visible={exerciseModalVisible}
        exercise={selectedExercise}
        onClose={closeExercise}
        onComplete={completeExercise}
      />

      <TechniqueModal
        visible={techniqueModalVisible}
        completedSteps={completedSteps}
        onToggleStep={toggleTechniqueStep}
        onClose={closeTechnique}
        onComplete={completeTechnique}
      />

      <MoodModal visible={moodModalVisible} onClose={closeMoodModal} onRegister={registerMood} />
    </SafeAreaView>
  );
}
