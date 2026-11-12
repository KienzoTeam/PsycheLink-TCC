// Os seis hábitos do check-in, na ordem de exibição: id que o app envia, coluna em `habito`
// e chave no JSON do servidor.
export const HABITOS = [
  { id: 'hidratacao', coluna: 'hidratacao', chave: 'hidratacao' },
  { id: 'exercicio', coluna: 'exercicio', chave: 'exercicio' },
  { id: 'meditacao', coluna: 'meditacao', chave: 'meditacao' },
  { id: 'telas', coluna: 'limite_telas', chave: 'limiteTelas' },
  { id: 'social', coluna: 'contato_social', chave: 'contatoSocial' },
  { id: 'medicacao', coluna: 'medicacao', chave: 'medicacao' },
] as const;

export type Habitos = Record<(typeof HABITOS)[number]['chave'], boolean>;

/** Linha de `habito` (alias h) como objeto com as chaves do JSON, na ordem da tabela; NULL sem linha. */
export const HABITOS_JSON = `CASE WHEN h.id IS NULL THEN NULL ELSE json_build_object(${HABITOS.map(
  ({ chave, coluna }) => `'${chave}', h.${coluna}`,
).join(', ')}) END`;
