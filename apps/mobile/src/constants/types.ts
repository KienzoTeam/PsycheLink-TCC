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

// Registro de humor após um momento de autocuidado. Pronto para futura integração com a API 
 
export interface MoodEntry {
  mood: string;
  source: 'exercise' | 'technique';
  sourceId: string;
  registeredAt: string;
}
