-- Escalas: catálogo com itens pt-BR, aplicação com ciclo de vida e respostas por item cifradas.

-- Escala nasce inativa: só entra no catálogo depois de ter itens e opções.
ALTER TABLE escala
    ADD COLUMN sigla text,
    ADD COLUMN itens jsonb,
    ADD COLUMN opcoes jsonb,
    ADD COLUMN instrucao text,
    ADD COLUMN pontuacao_maxima integer,
    ADD COLUMN subescalas jsonb,
    ADD COLUMN ativa boolean NOT NULL DEFAULT false,
    ADD CONSTRAINT uk_escala_sigla UNIQUE (sigla);

-- itens: enunciados em ordem (número do item = posição + 1).
-- subescalas (só DASS-21): chave -> {rotulo, itens}, com os números dos itens (base 1).
INSERT INTO escala (sigla, nome, total_questoes, pontuacao_maxima, validacao_ref, instrucao, opcoes, itens, ativa)
VALUES
('PHQ-9', 'Questionário sobre a Saúde do Paciente (PHQ-9)', 9, 27, 'Nunes e Faro (2022)',
 'Durante as últimas 2 semanas, com que frequência você foi incomodado(a) por qualquer um dos problemas abaixo?',
 $json$[{"valor":0,"rotulo":"Nenhuma vez"},{"valor":1,"rotulo":"Vários dias"},{"valor":2,"rotulo":"Mais da metade dos dias"},{"valor":3,"rotulo":"Quase todos os dias"}]$json$,
 $json$[
   "Pouco interesse ou pouco prazer em fazer as coisas",
   "Se sentir “para baixo”, deprimido(a) ou sem perspectiva",
   "Dificuldade para pegar no sono ou permanecer dormindo, ou dormir mais do que de costume",
   "Se sentir cansado(a) ou com pouca energia",
   "Falta de apetite ou comendo demais",
   "Se sentir mal consigo mesmo(a), ou achar que você é um fracasso ou decepcionou sua família ou você mesmo(a)",
   "Dificuldade para se concentrar nas coisas, como ler o jornal ou ver televisão",
   "Lentidão para se movimentar ou falar, a ponto de outras pessoas perceberem? Ou o oposto, estar tão agitado(a) ou irrequieto(a) que você fica andando de um lado para o outro muito mais do que de costume",
   "Pensar em se ferir de alguma maneira ou que seria melhor estar morto(a)"
 ]$json$, true),
('GAD-7', 'Escala de Transtorno de Ansiedade Generalizada (GAD-7)', 7, 21, 'Sousa et al. (2015)',
 'Durante as últimas 2 semanas, com que frequência você foi incomodado(a) pelos problemas abaixo?',
 $json$[{"valor":0,"rotulo":"Nenhuma vez"},{"valor":1,"rotulo":"Vários dias"},{"valor":2,"rotulo":"Mais da metade dos dias"},{"valor":3,"rotulo":"Quase todos os dias"}]$json$,
 $json$[
   "Sentir-se nervoso(a), ansioso(a) ou muito tenso(a)",
   "Não ser capaz de impedir ou de controlar as preocupações",
   "Preocupar-se muito com diversas coisas",
   "Dificuldade para relaxar",
   "Ficar tão agitado(a) que se torna difícil permanecer sentado(a)",
   "Ficar facilmente aborrecido(a) ou irritado(a)",
   "Sentir medo como se algo horrível fosse acontecer"
 ]$json$, true)
ON CONFLICT (sigla) DO UPDATE SET
    nome = EXCLUDED.nome, total_questoes = EXCLUDED.total_questoes,
    pontuacao_maxima = EXCLUDED.pontuacao_maxima, validacao_ref = EXCLUDED.validacao_ref,
    instrucao = EXCLUDED.instrucao, opcoes = EXCLUDED.opcoes, itens = EXCLUDED.itens, ativa = true;

-- O PHQ-2 são os dois primeiros itens do PHQ-9, com a mesma redação.
INSERT INTO escala (sigla, nome, total_questoes, pontuacao_maxima, validacao_ref, instrucao, opcoes, itens, ativa)
SELECT 'PHQ-2', 'Questionário sobre a Saúde do Paciente (PHQ-2)', 2, 6, 'derivado do PHQ-9 validado',
       instrucao, opcoes, jsonb_build_array(itens -> 0, itens -> 1), true
  FROM escala WHERE sigla = 'PHQ-9'
ON CONFLICT (sigla) DO UPDATE SET
    nome = EXCLUDED.nome, total_questoes = EXCLUDED.total_questoes,
    pontuacao_maxima = EXCLUDED.pontuacao_maxima, validacao_ref = EXCLUDED.validacao_ref,
    instrucao = EXCLUDED.instrucao, opcoes = EXCLUDED.opcoes, itens = EXCLUDED.itens, ativa = true;

-- DASS-21: cada subescala vale 2x a soma dos seus itens (0 a 42); o total é a soma das três (0 a 126).
INSERT INTO escala (sigla, nome, total_questoes, pontuacao_maxima, validacao_ref, instrucao, opcoes, subescalas, itens, ativa)
VALUES
('DASS-21', 'Escala de Depressão, Ansiedade e Estresse (DASS-21)', 21, 126, 'Vignola e Tucci (2014)',
 'Por favor, leia cuidadosamente cada uma das afirmações abaixo e escolha o número apropriado (0, 1, 2 ou 3) que indique o quanto ela se aplicou a você durante a última semana.',
 $json$[{"valor":0,"rotulo":"Não se aplicou de maneira nenhuma"},{"valor":1,"rotulo":"Aplicou-se em algum grau, ou por pouco tempo"},{"valor":2,"rotulo":"Aplicou-se em um grau considerável, ou por uma boa parte do tempo"},{"valor":3,"rotulo":"Aplicou-se muito, ou na maioria do tempo"}]$json$,
 $json${"depressao":{"rotulo":"Depressão","itens":[3,5,10,13,16,17,21]},"ansiedade":{"rotulo":"Ansiedade","itens":[2,4,7,9,15,19,20]},"estresse":{"rotulo":"Estresse","itens":[1,6,8,11,12,14,18]}}$json$,
 $json$[
   "Achei difícil me acalmar",
   "Senti minha boca seca",
   "Não consegui vivenciar nenhum sentimento positivo",
   "Tive dificuldade em respirar em alguns momentos (p. ex. respiração ofegante, falta de ar, sem ter feito nenhum esforço físico)",
   "Achei difícil ter iniciativa para fazer as coisas",
   "Tive a tendência de reagir de forma exagerada às situações",
   "Senti tremores (p. ex. nas mãos)",
   "Senti que estava sempre nervoso",
   "Preocupei-me com situações em que eu pudesse entrar em pânico e parecesse ridículo(a)",
   "Senti que não tinha nada a desejar",
   "Senti-me agitado",
   "Achei difícil relaxar",
   "Senti-me depressivo(a), sem ânimo",
   "Fui intolerante com as coisas que me impediam de continuar o que eu estava fazendo",
   "Senti que ia entrar em pânico",
   "Não consegui me entusiasmar com nada",
   "Senti que não tinha valor como pessoa",
   "Senti que estava um pouco emotivo/sensível demais",
   "Sabia que meu coração estava alterado mesmo não tendo feito nenhum esforço físico (p. ex. aumento da frequência cardíaca, disritmia cardíaca)",
   "Senti medo sem motivo",
   "Senti que a vida não tinha sentido"
 ]$json$, true)
ON CONFLICT (sigla) DO UPDATE SET
    nome = EXCLUDED.nome, total_questoes = EXCLUDED.total_questoes,
    pontuacao_maxima = EXCLUDED.pontuacao_maxima, validacao_ref = EXCLUDED.validacao_ref,
    instrucao = EXCLUDED.instrucao, opcoes = EXCLUDED.opcoes, subescalas = EXCLUDED.subescalas,
    itens = EXCLUDED.itens, ativa = true;

-- Datas com fuso: as colunas antigas guardam o relógio UTC do banco.
ALTER TABLE aplicacao_escala
    ALTER COLUMN solicitado_em DROP DEFAULT,
    ALTER COLUMN solicitado_em TYPE timestamptz USING solicitado_em AT TIME ZONE 'UTC',
    ALTER COLUMN respondido_em TYPE timestamptz USING respondido_em AT TIME ZONE 'UTC';
ALTER TABLE aplicacao_escala
    ALTER COLUMN solicitado_em SET DEFAULT now(),
    ALTER COLUMN solicitado_em SET NOT NULL;

-- Linhas fora do ciclo de vida novo viram canceladas; entre abertas duplicadas fica a mais nova.
UPDATE aplicacao_escala SET status = 'cancelada'
 WHERE status IS NULL OR status NOT IN ('pendente', 'em_andamento', 'concluida', 'cancelada');
UPDATE aplicacao_escala a SET status = 'cancelada'
 WHERE a.status IN ('pendente', 'em_andamento')
   AND EXISTS (SELECT 1 FROM aplicacao_escala o
                WHERE o.paciente_id = a.paciente_id AND o.escala_id = a.escala_id
                  AND o.status IN ('pendente', 'em_andamento') AND o.id > a.id);

-- Score em claro (precisa para séries); as respostas por item vão cifradas num único JSON.
ALTER TABLE aplicacao_escala
    ADD COLUMN cancelado_em timestamptz,
    ADD COLUMN iniciado_em timestamptz,
    ADD COLUMN score_total integer,
    ADD COLUMN subscores jsonb,
    ADD COLUMN respostas_cifradas text,
    ALTER COLUMN status SET NOT NULL,
    ADD CONSTRAINT aplicacao_escala_status_check
        CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada')),
    ADD CONSTRAINT aplicacao_escala_concluida_check
        CHECK (status <> 'concluida'
               OR (score_total IS NOT NULL AND respondido_em IS NOT NULL AND respostas_cifradas IS NOT NULL));

UPDATE aplicacao_escala SET cancelado_em = now() WHERE status = 'cancelada' AND cancelado_em IS NULL;

CREATE UNIQUE INDEX uk_aplicacao_aberta ON aplicacao_escala (paciente_id, escala_id)
    WHERE status IN ('pendente', 'em_andamento');
CREATE INDEX idx_aplicacao_psicologo ON aplicacao_escala (psicologo_id, status);
CREATE INDEX idx_aplicacao_paciente ON aplicacao_escala (paciente_id, status);

-- As respostas por item moram em aplicacao_escala.respostas_cifradas (um JSON cifrado, gravado
-- junto do score). Esta tabela fica como legado: sem uso e sem linhas.
COMMENT ON TABLE resposta_escala IS 'Legada. Respostas por item: aplicacao_escala.respostas_cifradas.';

-- RLS: o psicólogo só enxerga o que ele mesmo aplicou (não o que um psicólogo anterior aplicou
-- no mesmo paciente), solicita com vínculo ativo e só consegue cancelar.
DROP POLICY aplicacao_psicologo_vinculado ON aplicacao_escala;

CREATE POLICY aplicacao_psicologo_vinculado ON aplicacao_escala FOR SELECT TO psychelink_app
    USING (psicologo_id = app_psicologo_id() AND EXISTS (
        SELECT 1 FROM vinculo v
         WHERE v.paciente_id = aplicacao_escala.paciente_id
           AND v.psicologo_id = app_psicologo_id() AND v.status = 'ativo'));

CREATE POLICY aplicacao_psicologo_solicita ON aplicacao_escala FOR INSERT TO psychelink_app
    WITH CHECK (psicologo_id = app_psicologo_id() AND status = 'pendente' AND EXISTS (
        SELECT 1 FROM vinculo v
         WHERE v.paciente_id = aplicacao_escala.paciente_id
           AND v.psicologo_id = app_psicologo_id() AND v.status = 'ativo'));

CREATE POLICY aplicacao_psicologo_cancela ON aplicacao_escala FOR UPDATE TO psychelink_app
    USING (psicologo_id = app_psicologo_id() AND EXISTS (
        SELECT 1 FROM vinculo v
         WHERE v.paciente_id = aplicacao_escala.paciente_id
           AND v.psicologo_id = app_psicologo_id() AND v.status = 'ativo'))
    WITH CHECK (psicologo_id = app_psicologo_id() AND status = 'cancelada');

-- Encerrar o vínculo cancela as aplicações abertas: ninguém mais as enxerga, e uma aberta
-- esquecida bloquearia (409) a mesma escala pedida pelo próximo psicólogo. SECURITY DEFINER porque
-- o papel da aplicação não passa pela RLS sem contexto (o dono tem BYPASSRLS no Neon).
CREATE FUNCTION cancelar_aplicacoes_do_vinculo() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    UPDATE aplicacao_escala SET status = 'cancelada', cancelado_em = now()
     WHERE paciente_id = NEW.paciente_id AND psicologo_id = NEW.psicologo_id
       AND status IN ('pendente', 'em_andamento');
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_vinculo_encerrado_aplicacoes
    AFTER UPDATE OF status ON vinculo
    FOR EACH ROW WHEN (OLD.status = 'ativo' AND NEW.status = 'encerrado')
    EXECUTE FUNCTION cancelar_aplicacoes_do_vinculo();
