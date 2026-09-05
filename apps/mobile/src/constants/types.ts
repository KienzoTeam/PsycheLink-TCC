import { ComponentProps } from 'react';
import { Feather } from '@expo/vector-icons';

export type FeatherIcon = ComponentProps<typeof Feather>['name'];

export type ExerciseType =
  | 'breathing'
  | 'mindfulness'
  | 'relaxation'
  | 'grounding';

export type ExerciseStatus = 'idle' | 'running' | 'paused';

export type CardVariant = 'primary' | 'secondary' | 'tertiary';

export interface Exercise {
  id: string;
  title: string;
  description: string;
  durationSeconds: number;
  durationLabel: string;
  icon: FeatherIcon;
  type: ExerciseType;
  steps: string[];
  /**
   * Peso relativo de cada passo em relação ao tempo total do exercício.
   * Se omitido, os passos são distribuídos em partes iguais.
   * O array precisa ter o mesmo tamanho de `steps` e a soma pode ser
   * qualquer valor (é normalizada internamente).
   */
  stepWeights?: number[];
}

export interface TechniqueStep {
  number: number;
  title: string;
  description: string;
  icon: FeatherIcon;
}

export interface MoodOption {
  value: string;
  emoji: string;
  label: string;
}

/**
 * Registro de humor após um momento de autocuidado.
 * Pronto para futura integração com a API (LGPD: nunca é
 * compartilhado automaticamente com o psicólogo).
 */
export interface MoodEntry {
  mood: string;
  source: 'exercise' | 'technique';
  sourceId: string;
  registeredAt: string;
}
