import { createHash, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import type { RequestHandler } from 'express';

// Pedidos do painel chegam pela Function da Cloudflare Pages, e o Render vê o IP da Cloudflare.
// A Function manda o IP real do usuário (x-psychelink-ip) junto com PROXY_SEGREDO; só com o
// segredo certo esse IP vale como req.ip (rate limit e auditoria). Sem PROXY_SEGREDO, nada muda.
const resumo = (valor: string) => createHash('sha256').update(valor).digest();

export const ipDaPages: RequestHandler = (req, _res, next) => {
  const segredo = process.env.PROXY_SEGREDO;
  const enviado = req.get('x-psychelink-segredo');
  const ip = req.get('x-psychelink-ip');
  if (segredo && enviado && ip && isIP(ip) && timingSafeEqual(resumo(enviado), resumo(segredo))) {
    Object.defineProperty(req, 'ip', { value: ip });
  }
  next();
};
