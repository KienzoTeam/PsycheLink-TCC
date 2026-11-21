import type { Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { z } from 'zod';

// Após autenticação, isola contas; antes dela, mantém a proteção por IP.
// `chave` preserva limites explícitos já existentes.
export const limite = (n: number, chave?: (req: Request) => string) =>
  rateLimit({
    windowMs: 15 * 60_000,
    limit: n,
    message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
    keyGenerator: chave ?? ((req) => req.user ? `usuario:${req.user.id}` : ipKeyGenerator(req.ip ?? '0.0.0.0')),
  });

// Defesa adicional por IP em operações sensíveis e antes da validação do token.
export const limitePorIp = (n: number) => rateLimit({
  windowMs: 15 * 60_000,
  limit: n,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});

/** Id numérico de um parâmetro de rota; null se não for inteiro positivo. */
export function idDe(texto: string): number | null {
  const id = Number(texto);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Envolve a rota e converte qualquer erro inesperado em 500 padronizado. */
export function rota<P extends Record<string, string> = Record<string, string>>(
  fn: (req: Request<P>, res: Response) => Promise<unknown>,
) {
  return async (req: Request<P>, res: Response) => {
    try {
      await fn(req, res);
    } catch (err) {
      console.error('Erro na rota:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Erro interno no servidor.' });
    }
  };
}

/** Valida corpo ou query com zod; em caso de falha já responde 400 e devolve null. */
export function lerOuNegar<S extends z.ZodType>(
  schema: S,
  dados: unknown,
  res: Response,
): z.output<S> | null {
  const parsed = schema.safeParse(dados);
  if (parsed.success) return parsed.data;
  res.status(400).json({ error: 'Dados inválidos.' });
  return null;
}
