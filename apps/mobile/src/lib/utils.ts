import { Exercise } from '../../src/constants/types';

export function formatTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
    2,
    '0',
  )}`;
}


export function getActiveStepIndex(
  exercise: Pick<Exercise, 'steps' | 'durationSeconds' | 'stepWeights'>,
  elapsedSeconds: number,
) {
  const { steps, durationSeconds, stepWeights } = exercise;

  if (steps.length === 0) {
    return 0;
  }

  const weights =
    stepWeights && stepWeights.length === steps.length
      ? stepWeights
      : steps.map(() => 1);

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  if (totalWeight <= 0) {
    return 0;
  }

  const progressRatio = Math.min(
    Math.max(elapsedSeconds / Math.max(durationSeconds, 1), 0),
    1,
  );
  const elapsedWeight = progressRatio * totalWeight;

  let cumulativeWeight = 0;

  for (let index = 0; index < weights.length; index += 1) {
    cumulativeWeight += weights[index];

    if (elapsedWeight < cumulativeWeight || index === weights.length - 1) {
      return index;
    }
  }

  return weights.length - 1;
}
