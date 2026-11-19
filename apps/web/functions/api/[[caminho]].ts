// Cloudflare Pages Function: repassa /api/* para a API no Render. O painel e a API ficam na mesma
// origem, e os cookies de sessão (SameSite=Strict, path=/api) continuam valendo.
// Variáveis do projeto na Cloudflare (Settings → Variables and Secrets):
// - API_URL: ex.: https://psychelink-tcc.onrender.com
// - PROXY_SEGREDO: o mesmo valor do Render. Sem ele, a API vê o IP da Cloudflare em vez do usuário,
//   e todos dividem o mesmo limite de tentativas de login.
type Ambiente = { API_URL?: string; PROXY_SEGREDO?: string };

export const onRequest = async ({ request, env }: { request: Request; env: Ambiente }) => {
  if (!env.API_URL) return new Response('API_URL não configurada', { status: 500 });
  const url = new URL(request.url);
  const destino = env.API_URL.replace(/\/$/, '') + url.pathname.replace(/^\/api/, '') + url.search;
  const pedido = new Request(destino, request);
  const ip = request.headers.get('CF-Connecting-IP');
  if (env.PROXY_SEGREDO && ip) {
    pedido.headers.set('x-psychelink-ip', ip);
    pedido.headers.set('x-psychelink-segredo', env.PROXY_SEGREDO);
  }
  return fetch(pedido);
};
