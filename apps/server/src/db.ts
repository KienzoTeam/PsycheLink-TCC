import { Pool } from 'pg';

// TLS vem do sslmode da URL (verify-full): sem override, o certificado do servidor é verificado.
// Conexão nova custa TCP + TLS + SCRAM (~6 idas e voltas até o Neon). O padrão do pg fecha a ociosa
// em 10 s, e quase toda requisição do app (o usuário lê a tela entre uma e outra) pagava isso de novo.
// 4 min fica abaixo do autosuspend do Neon (5 min), que derruba as conexões de qualquer forma.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  idleTimeoutMillis: 4 * 60_000,
  // Sonda TCP na ociosa: NAT/roteador não descarta a conexão em silêncio (a query seguinte travaria).
  keepAlive: true,
  keepAliveInitialDelayMillis: 30_000,
  // O padrão do pg espera para sempre por conexão (banco fora ou Neon acordando). Vale para toda rota,
  // /health inclusive: com 10 s ela responde 503 antes de os clientes (15 s) desistirem.
  connectionTimeoutMillis: 10_000,
});

// Conexão ociosa derrubada pelo servidor (autosuspend do Neon, rede) emite 'error' no pool; sem ouvinte
// o processo cai. O pool já descarta o cliente: só registra.
pool.on('error', (err) => console.error('Conexão ociosa com o banco caiu:', err.message));
