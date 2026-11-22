import type { RequestHandler } from 'express';

// Diagnóstico para achar o valor certo de TRUST_PROXY. Só entra com DEBUG_IP=1 (ver app.ts):
// registra o IP da conexão, o X-Forwarded-For e o req.ip que o Express calculou, e para depois
// de `limite` pedidos. O /health fica de fora: o Render o chama a cada 5 s e gastaria o limite.
// IP é dado pessoal, então ligue, faça o teste e desligue em seguida.
export function criarDepurarIp(limite = 20): RequestHandler {
  let registrados = 0;
  return (req, _res, next) => {
    if (registrados < limite && req.path !== '/health') {
      registrados += 1;
      console.log(
        '[debug-ip]',
        JSON.stringify({
          caminho: req.path,
          conexao: req.socket.remoteAddress ?? null,
          xForwardedFor: req.get('x-forwarded-for')?.slice(0, 200) ?? null,
          ip: req.ip,
        }),
      );
    }
    next();
  };
}
