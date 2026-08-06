import { z } from 'zod';

/**
 * Feedback de UX intencionalmente leve. A API faz a normalização Punycode e a
 * validação definitiva; esta checagem não bloqueia a digitação nem exclui IDNs.
 */
export const emailSyntaxSchema = z.string().trim().min(3).max(254).superRefine((value, context) => {
  const at = value.lastIndexOf('@');
  const hasLocalPart = at > 0;
  const domain = hasLocalPart ? value.slice(at + 1) : '';
  const hasDomain = domain.length > 0 && domain.includes('.');

  if (!hasLocalPart || !hasDomain) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Informe um e-mail no formato nome@domínio.com.',
    });
  }
});

export function getEmailSyntaxError(value: string): string | undefined {
  const parsed = emailSyntaxSchema.safeParse(value);
  return parsed.success ? undefined : parsed.error.issues[0]?.message;
}
