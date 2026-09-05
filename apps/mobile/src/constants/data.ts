import { Exercise, MoodOption, TechniqueStep } from './types';

export const QUICK_EXERCISES: Exercise[] = [
  {
    id: 'breathing-one-minute',
    title: 'Respirar por 1 minuto',
    description: 'Respire fundo e acalme a mente',
    durationSeconds: 60,
    durationLabel: '1 min',
    icon: 'wind',
    type: 'breathing',
    steps: [
      'Inspire pelo nariz durante 4 segundos.',
      'Segure o ar durante 2 segundos.',
      'Expire lentamente durante 6 segundos.',
    ],
  },
  {
    id: 'mindful-break',
    title: 'Fazer uma pausa consciente',
    description: 'Pare e observe o momento presente',
    durationSeconds: 60,
    durationLabel: '1 min',
    icon: 'coffee',
    type: 'mindfulness',
    steps: [
      'Pare por alguns segundos.',
      'Observe sua respiração sem tentar modificá-la.',
      'Perceba como seu corpo está neste momento.',
      'Observe o ambiente ao seu redor.',
      'Retorne às suas atividades com gentileza.',
    ],
  },
  {
    id: 'quick-relaxation',
    title: 'Exercício rápido de relaxamento',
    description: 'Libere a tensão do corpo',
    durationSeconds: 120,
    durationLabel: '2 min',
    icon: 'activity',
    type: 'relaxation',
    steps: [
      'Eleve os ombros suavemente.',
      'Solte os ombros e perceba o relaxamento.',
      'Abra e feche as mãos devagar.',
      'Movimente o pescoço com cuidado.',
      'Respire fundo e relaxe as pernas.',
    ],
  },
];

export const GUIDED_EXERCISES: Exercise[] = [
  {
    id: 'breathing-478',
    title: 'Respiração 4-7-8',
    description: 'Técnica calmante para reduzir a ansiedade',
    durationSeconds: 300,
    durationLabel: '5 min',
    icon: 'wind',
    type: 'breathing',
    steps: [
      'Inspire pelo nariz durante 4 segundos.',
      'Segure a respiração durante 7 segundos.',
      'Expire pela boca durante 8 segundos.',
      'Repita o ciclo respeitando seus limites.',
    ],
    // Os 3 primeiros passos mapeiam o ciclo real de 4-7-8-19s; o último
    // ("repita") ocupa o restante do exercício.
    stepWeights: [4, 7, 8, 281],
  },
  {
    id: 'diaphragmatic-breathing',
    title: 'Respiração diafragmática',
    description: 'Aprofunde a calma com a respiração',
    durationSeconds: 180,
    durationLabel: '3 min',
    icon: 'heart',
    type: 'breathing',
    steps: [
      'Coloque uma mão sobre o abdômen.',
      'Inspire lentamente pelo nariz.',
      'Perceba o abdômen se elevar.',
      'Expire suavemente pela boca.',
    ],
  },
  {
    id: 'progressive-relaxation',
    title: 'Relaxamento muscular progressivo',
    description: 'Libere a tensão do corpo aos poucos',
    durationSeconds: 480,
    durationLabel: '8 min',
    icon: 'activity',
    type: 'relaxation',
    steps: [
      'Relaxe os músculos do rosto.',
      'Solte os ombros e os braços.',
      'Relaxe as mãos e o abdômen.',
      'Leve a atenção para as pernas.',
      'Relaxe os pés lentamente.',
    ],
  },
  {
    id: 'mindfulness-meditation',
    title: 'Meditação de atenção plena',
    description: 'Observe o presente sem julgamentos',
    durationSeconds: 300,
    durationLabel: '5 min',
    icon: 'circle',
    type: 'mindfulness',
    steps: [
      'Encontre uma postura confortável.',
      'Observe o ritmo natural da sua respiração.',
      'Perceba os pensamentos sem julgá-los.',
      'Observe as sensações do seu corpo.',
      'Volte gentilmente sua atenção ao presente.',
    ],
  },
  {
    id: 'grounding',
    title: 'Técnica de aterramento',
    description: 'Reconecte-se com o momento presente',
    durationSeconds: 240,
    durationLabel: '4 min',
    icon: 'anchor',
    type: 'grounding',
    steps: [
      'Sinta seus pés apoiados no chão.',
      'Observe três objetos ao seu redor.',
      'Perceba dois sons próximos.',
      'Toque uma superfície e perceba sua textura.',
      'Respire fundo e reconheça onde você está.',
    ],
  },
  {
    id: 'mindful-stretching',
    title: 'Alongamento consciente',
    description: 'Movimente o corpo com leveza',
    durationSeconds: 300,
    durationLabel: '5 min',
    icon: 'move',
    type: 'relaxation',
    steps: [
      'Alongue os braços acima da cabeça.',
      'Incline o pescoço suavemente.',
      'Gire os ombros devagar.',
      'Alongue as pernas sem sentir dor.',
      'Finalize respirando profundamente.',
    ],
  },
];

export const TECHNIQUE_STEPS: TechniqueStep[] = [
  {
    number: 5,
    title: 'Coisas que você vê',
    description: 'Observe cinco coisas ao seu redor.',
    icon: 'eye',
  },
  {
    number: 4,
    title: 'Coisas que você toca',
    description: 'Perceba quatro texturas ou sensações.',
    icon: 'mouse-pointer',
  },
  {
    number: 3,
    title: 'Coisas que você ouve',
    description: 'Identifique três sons ao seu redor.',
    icon: 'volume-2',
  },
  {
    number: 2,
    title: 'Coisas que você cheira',
    description: 'Perceba dois aromas no ambiente.',
    icon: 'wind',
  },
  {
    number: 1,
    title: 'Coisa que você saboreia',
    description: 'Perceba um sabor presente agora.',
    icon: 'coffee',
  },
];

export const MOOD_OPTIONS: MoodOption[] = [
  { value: 'very_bad', emoji: '😞', label: 'Muito mal' },
  { value: 'bad', emoji: '😕', label: 'Mal' },
  { value: 'neutral', emoji: '😐', label: 'Neutro' },
  { value: 'good', emoji: '🙂', label: 'Bem' },
  { value: 'very_good', emoji: '😊', label: 'Muito bem' },
];
