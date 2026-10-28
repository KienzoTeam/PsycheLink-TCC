// Importado antes de tudo: a app passa a conectar como o dono do banco, que ignora o RLS.
// Assim o teste prova que a própria aplicação nega o acesso, sem depender das policies.
process.env.DATABASE_URL = process.env.DATABASE_URL_DIRETA;
