import { z } from 'zod';


function parseDataNascimento(valor: string): string | null {
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!br && !iso) return null;

  const [dia, mes, ano] = br
    ? [Number(br[1]), Number(br[2]), Number(br[3])]
    : [Number(iso![3]), Number(iso![2]), Number(iso![1])];

  const d = new Date(Date.UTC(ano, mes - 1, dia));
  const calendarioOk =
    d.getUTCDate() === dia && d.getUTCMonth() === mes - 1 && d.getUTCFullYear() === ano;

  if (!calendarioOk || d.getTime() >= Date.now()) return null; // inválida ou no futuro

  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

export const senhaSchema = z
  .string()
  .min(8, 'Senha deve ter no mínimo 8 caracteres')
  .max(72, 'Senha deve ter no máximo 72 caracteres'); // bcrypt ignora além de 72 bytes

export const registroSchema = z.object({
  nome: z.string().trim().min(2, 'Nome muito curto').max(120),
  email: z.string(), // validado por normalizarEmail() (IDN/punycode), não aqui
  password: senhaSchema,
  dataNascimento: z
    .string()
    .refine((v) => parseDataNascimento(v.trim()) !== null, {
      message: 'Informe uma data de nascimento válida.',
    })
    .transform((v) => parseDataNascimento(v.trim())!),
});

export type DadosRegistro = z.infer<typeof registroSchema>;


export const checkinSchema = z.object({
  emocoes: z.array(z.string()).min(1, 'Selecione ao menos uma emoção.'),
  intensidade: z.number().int().min(1).max(10).optional(),
  humor: z.number().int().min(1).max(10),
  ansiedade: z.number().int().min(1).max(10),
  horasSono: z.number().min(0).max(24),
  qualidadeSono: z.enum(['Ruim', 'Regular', 'Boa']).nullable(),
  contextos: z.array(z.string()),
  habitos: z.array(z.string()), 
  notas: z.string().max(2000).optional(),
});

export type DadosCheckin = z.infer<typeof checkinSchema>;


// Cadastro exclusivo de psicólogos (web). Reaproveita as regras do cadastro comum
// e acrescenta o CRP obrigatório e a especialidade opcional.
export const psicologoRegistroSchema = registroSchema.extend({
  crp: z
    .string()
    .transform((v) => v.replace(/\s+/g, ''))
    .refine((v) => /^\d{2}\/\d{5,6}$/.test(v), {
      message: 'CRP inválido. Use o formato 00/000000.',
    }),
  especialidade: z
    .string()
    .trim()
    .max(255, 'Especialidade muito longa.')
    .optional()
    .transform((v) => (v ? v : null)),
});

export type DadosRegistroPsicologo = z.infer<typeof psicologoRegistroSchema>;

export const anotacaoSchema = z.object({
  conteudo: z
    .string()
    .trim()
    .min(1, 'A anotação não pode ser vazia.')
    .max(5000, 'A anotação excede 5000 caracteres.'),
});
