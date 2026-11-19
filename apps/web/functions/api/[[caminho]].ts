// Cloudflare Pages Function: repassa /api/* para a API no Render. O painel e a API ficam na mesma
// origem, e os cookies de sessão (SameSite=Strict, path=/api) continuam valendo.
// API_URL é variável do projeto na Cloudflare (Settings → Variables), ex.: https://psychelink-api.onrender.com
export const onRequest = async ({ request, env }: { request: Request; env: { API_URL?: string } }) => {
  if (!env.API_URL) return new Response('API_URL não configurada', { status: 500 });
  const url = new URL(request.url);
  const destino = env.API_URL.replace(/\/$/, '') + url.pathname.replace(/^\/api/, '') + url.search;
  return fetch(new Request(destino, request));
};
