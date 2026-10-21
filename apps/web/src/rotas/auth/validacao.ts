import { z } from 'zod';
import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';

export type Valores = {
  nome: string;
  email: string;
  password: string;
  confirmacao: string;
  dataNascimento: string;
  crp: string;
  especialidade: string;
};

export const VALORES_VAZIOS: Valores = {
  nome: '',
  email: '',
  password: '',
  confirmacao: '',
  dataNascimento: '',
  crp: '',
  especialidade: '',
};

// Espelha apps/server/src/schemas.ts: DD/MM/AAAA ou AAAA-MM-DD, data real e no passado.
function dataParaIso(valor: string): string | null {
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!br && !iso) return null;
  const [dia, mes, ano] = br
    ? [Number(br[1]), Number(br[2]), Number(br[3])]
    : [Number(iso?.[3]), Number(iso?.[2]), Number(iso?.[1])];
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  const real = data.getUTCDate() === dia && data.getUTCMonth() === mes - 1 && data.getUTCFullYear() === ano;
  if (!real || data.getTime() >= Date.now()) return null;
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** Máscara DD/MM/AAAA enquanto digita; converte o AAAA-MM-DD que o autopreenchimento pode trazer. */
export function mascararData(valor: string): string {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  const digitos = (iso ? `${iso[3]}${iso[2]}${iso[1]}` : valor).replace(/\D/g, '').slice(0, 8);
  return [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4)].filter(Boolean).join('/');
}

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Informe seu e-mail.')
  .refine((v) => !v || z.email().safeParse(v).success, 'Formato de e-mail inválido.');

const senhaNova = z
  .string()
  .min(1, 'Informe uma senha.')
  .min(8, 'Senha deve ter no mínimo 8 caracteres')
  .max(72, 'Senha deve ter no máximo 72 caracteres');

const confirmacao = z.string().min(1, 'Repita a senha.');

const confirmar = <T extends { password: string; confirmacao: string }>(v: T) => v.password === v.confirmacao;
const MSG_CONFIRMACAO = { path: ['confirmacao'], message: 'As senhas não conferem.' };

export const esquemaLogin = z.object({ email, password: z.string().min(1, 'Informe sua senha.') });

export const esquemaCadastro = z
  .object({
    nome: z.string().trim().min(1, 'Informe seu nome.').min(2, 'Nome muito curto.').max(120, 'Nome muito longo.'),
    email,
    dataNascimento: z.string().transform((v, ctx) => {
      const iso = dataParaIso(v.trim());
      if (iso === null) ctx.addIssue({ code: 'custom', message: 'Informe uma data de nascimento válida.' });
      return iso ?? z.NEVER;
    }),
    crp: z
      .string()
      .transform((v) => v.replace(/\s+/g, ''))
      .refine((v) => v !== '', 'Informe seu CRP.')
      .refine((v) => !v || /^\d{2}\/\d{5,6}$/.test(v), 'CRP inválido. Use o formato 00/000000.'),
    especialidade: z.string().trim().max(255, 'Especialidade muito longa.'),
    password: senhaNova,
    confirmacao,
  })
  .refine(confirmar, MSG_CONFIRMACAO);

export const esquemaEmail = z.object({ email });

export const esquemaNovaSenha = z.object({ password: senhaNova, confirmacao }).refine(confirmar, MSG_CONFIRMACAO);

/** Resolver do react-hook-form sobre um schema zod (o pacote @hookform/resolvers não está no projeto). */
export function resolverZod<T extends FieldValues>(esquema: z.ZodType<object>): Resolver<T> {
  return (valores) => {
    const resultado = esquema.safeParse(valores);
    if (resultado.success) return { values: { ...valores, ...resultado.data }, errors: {} };
    const erros: Record<string, { type: string; message: string }> = {};
    for (const problema of resultado.error.issues) {
      const campo = String(problema.path[0]);
      erros[campo] ??= { type: problema.code, message: problema.message };
    }
    return { values: {}, errors: erros as FieldErrors<T> };
  };
}
