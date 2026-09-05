import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Exercise, ExerciseStatus } from '../constants/types';
import { getActiveStepIndex } from '../lib/utils';

interface BreathingPhase {
  title: string;
  description: string;
}

interface UseGuidedExerciseTimerParams {
  visible: boolean;
  exercise: Exercise | null;
  onComplete: () => void;
}

// O tempo restante passou a ser calculado a partir de um timestamp de término (endTimestampRef) em vez de decrementar a cada tick do setInterval. Isso evita o acúmulo de atraso (drift) e mantém o cronômetro preciso mesmo em segundo plano.
export function useGuidedExerciseTimer({
  visible,
  exercise,
  onComplete,
}: UseGuidedExerciseTimerParams) {
  const [status, setStatus] = useState<ExerciseStatus>('idle');
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const endTimestampRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Reseta tudo sempre que o modal abre com um novo exercício.
  useEffect(() => {
    clearTimer();
    endTimestampRef.current = null;

    if (!visible || !exercise) {
      setStatus('idle');
      setRemainingSeconds(0);
      return;
    }

    setStatus('idle');
    setRemainingSeconds(exercise.durationSeconds);
  }, [visible, exercise, clearTimer]);

  useEffect(() => {
    if (status !== 'running' || !exercise) {
      clearTimer();
      return;
    }

    intervalRef.current = setInterval(() => {
      if (endTimestampRef.current === null) {
        return;
      }

      const secondsLeft = Math.max(
        0,
        Math.round((endTimestampRef.current - Date.now()) / 1000),
      );

      setRemainingSeconds(secondsLeft);

      if (secondsLeft === 0) {
        clearTimer();
        setStatus('idle');
        onComplete();
      }
      // Intervalo de 250ms deixa a contagem visualmente fluida sem gastar
      // bateria como um tick a cada frame.
    }, 250);

    return clearTimer;
  }, [status, exercise, clearTimer, onComplete]);

  const start = useCallback(() => {
    if (!exercise) {
      return;
    }

    const baseSeconds = remainingSeconds > 0 ? remainingSeconds : exercise.durationSeconds;
    endTimestampRef.current = Date.now() + baseSeconds * 1000;
    setRemainingSeconds(baseSeconds);
    setStatus('running');
  }, [exercise, remainingSeconds]);

  const pause = useCallback(() => {
    endTimestampRef.current = null;
    setStatus('paused');
  }, []);

  const toggle = useCallback(() => {
    if (status === 'running') {
      pause();
    } else {
      start();
    }
  }, [status, pause, start]);

  const reset = useCallback(() => {
    clearTimer();
    endTimestampRef.current = null;
    setStatus('idle');
    setRemainingSeconds(exercise?.durationSeconds ?? 0);
  }, [clearTimer, exercise]);

  const elapsedSeconds = exercise
    ? exercise.durationSeconds - remainingSeconds
    : 0;

  const activeStepIndex = useMemo(() => {
    if (!exercise) {
      return 0;
    }

    return getActiveStepIndex(exercise, elapsedSeconds);
  }, [exercise, elapsedSeconds]);

  const breathingPhase: BreathingPhase = useMemo(() => {
    if (!exercise || exercise.type !== 'breathing') {
      return {
        title: 'Continue',
        description: exercise?.steps[activeStepIndex] ?? '',
      };
    }

    if (exercise.id === 'breathing-478') {
      const cycleSecond = elapsedSeconds % 19;

      if (cycleSecond < 4) {
        return { title: 'Inspire', description: 'Inspire pelo nariz durante 4 segundos' };
      }

      if (cycleSecond < 11) {
        return { title: 'Segure', description: 'Segure a respiração durante 7 segundos' };
      }

      return { title: 'Expire', description: 'Expire pela boca durante 8 segundos' };
    }

    const cycleSecond = elapsedSeconds % 12;

    if (cycleSecond < 4) {
      return { title: 'Inspire', description: 'Inspire suavemente pelo nariz' };
    }

    if (cycleSecond < 6) {
      return { title: 'Segure', description: 'Mantenha o ar sem forçar' };
    }

    return { title: 'Expire', description: 'Solte o ar lentamente pela boca' };
  }, [exercise, activeStepIndex, elapsedSeconds]);

  return {
    status,
    remainingSeconds,
    elapsedSeconds,
    activeStepIndex,
    breathingPhase,
    start,
    pause,
    toggle,
    reset,
  };
}
