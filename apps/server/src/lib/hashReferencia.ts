import bcrypt from 'bcrypt';

// Hash de referência usado quando o e-mail não existe, para o tempo de resposta
// não revelar quais e-mails estão cadastrados.
export const HASH_REFERENCIA = bcrypt.hashSync('referencia-sem-conta', 10);
