-- Marcador factual do item 9 do PHQ-9 (pensamentos de morte ou de se ferir), gravado ao responder.
-- Não é classificação: só diz se a resposta foi diferente de "Nenhuma vez". NULL fora do PHQ-9.
ALTER TABLE aplicacao_escala ADD COLUMN item9_diferente_de_zero boolean;
