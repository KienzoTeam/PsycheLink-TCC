// Catálogo dos exercícios que existem no app (Bem-Estar e SOS), na ordem de exibição. Os ids são
// os mesmos de apps/mobile/src/constants/data.ts: o app abre o exercício certo a partir deles.
export const EXERCICIOS = [
  { id: 'breathing-one-minute', titulo: 'Respirar por 1 minuto' },
  { id: 'breathing-478', titulo: 'Respiração 4-7-8' },
  { id: 'diaphragmatic-breathing', titulo: 'Respiração diafragmática' },
  { id: 'mindful-break', titulo: 'Pausa consciente' },
  { id: 'quick-relaxation', titulo: 'Relaxamento rápido' },
  { id: 'progressive-relaxation', titulo: 'Relaxamento muscular progressivo' },
  { id: 'mindfulness-meditation', titulo: 'Meditação de atenção plena' },
  { id: 'grounding', titulo: 'Aterramento 5-4-3-2-1' },
  { id: 'mindful-stretching', titulo: 'Alongamento consciente' },
] as const;

export const tituloDoExercicio = (id: string) => EXERCICIOS.find((e) => e.id === id)?.titulo ?? null;
