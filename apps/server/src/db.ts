import { Pool } from 'pg';

// TLS vem do sslmode da URL (verify-full): sem override, o certificado do servidor é verificado.
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
