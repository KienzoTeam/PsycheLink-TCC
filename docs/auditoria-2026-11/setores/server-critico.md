# Server: revisão crítica dos setores (12/11/2026)

Leitura estática do commit `a630eae`. Nada foi executado. Este setor leu as entregas dos outros cinco (segurança, corretude, desempenho, complexidade e conformidade), procurou contradições entre eles, resolveu cada uma no código e procurou partes do server que ninguém revisou.

## Termos usados

- **Contradição**: dois setores afirmam coisas incompatíveis sobre o mesmo trecho.
- **Correções que se anulam**: duas correções propostas em que uma desfaz a proteção da outra.
- **READ COMMITTED**: o nível padrão do PostgreSQL. Uma transação não enxerga o que outra ainda não confirmou.

## Resumo

Cobertura: os setores cobriram todas as rotas, as libs e as 8 migrations. O inventário de 61 handlers foi comparado com a matriz da segurança por amostragem.

Ninguém tinha a tarefa de conferir se os cálculos estão certos. Este setor conferiu:

- `pontuar()`, que soma os itens de cada escala;
- o mapa das subescalas da DASS-21 (`0005:65`);
- o índice do item 9;
- o PHQ-2;
- `pearson()`, a correlação entre sono e humor.

Os cinco estão corretos, e `escalas.test.ts:57-79` trava esse comportamento.

Ficaram rasos: `scripts/seed-dev.ts`, `scripts/migrar.ts` e `test/`.

Há 5 achados novos. O principal é o **CAD-01** (média): um cadastro pendente de psicólogo bloqueia para sempre o mesmo e-mail como paciente. Os outros são baixos.

## Achados mantidos

Legenda do veredito: **confirmado** = um verificador refez o caminho; **não conferido** = o verificador não chegou a esse achado.

| Id | Sev. | Confiança | Veredito | Título | Onde | Cenário | Correção | Teste | Lote |
|---|---|---|---|---|---|---|---|---|---|
| CAD-01 | média | verificado | confirmado | Cadastro pendente de psicólogo bloqueia para sempre o e-mail como paciente; o reenvio transforma a conta em psicólogo verificado | `src/routes/auth.ts:176` | Um terceiro (ou a própria pessoa, por engano) faz `/auth/registro-psicologo` com o e-mail E. Depois o dono tenta `/auth/registro` pelo app: a condição `conta?.psicologo` não olha se a conta foi verificada, e a rota só manda um aviso, mas responde o mesmo 201. Isso se repete para sempre. Se o dono tocar "reenviar", a conta vira psicólogo verificado, com a senha e o CRP de quem a criou. Depois do A6, o e-mail fica impedido de vez de usar o app | Tratar o psicólogo pendente como pendente comum: dentro do lock, apagar a linha em `psicologo` e seguir com o cadastro de paciente. Barrar só o psicólogo verificado. O SEG-01 fecha o caminho do reenvio | `cadastro.test.ts`: registro de psicólogo com E, expirar o código, registro de paciente com E. Esperado: código novo (comparar `ultimoCodigo` antes e depois), confirmação 200, nenhuma linha em `psicologo` | — (cabe junto do A6) |
| DIA-01 | baixa | provável | não conferido | "Parar de compartilhar o diário" não alcança o check-in que está sendo gravado | `src/routes/paciente/consentimento.ts:123` | Um check-in com o diário marcado e o "parar" ao mesmo tempo: o UPDATE não vê o INSERT ainda não confirmado, e o texto fica liberado. Além disso, o "parar" não muda `compartilha_diario`, que é o valor inicial do interruptor no app; um rascunho aberto antes sai compartilhado | No "parar", gravar também `compartilha_diario=false` na mesma transação | `vinculo.test.ts`: PUT com diário true, "parar", GET: espera diário false | — |
| PER-01 | baixa | verificado | não conferido | Resumo com só `?de=` ignora o teto de 366 dias; a janela padrão tem N+1 dias | `src/lib/periodo.ts:11` | `?de=2000-01-01` sem `ate` passa e decifra o histórico inteiro. Sem datas, `dias=30` cobre 31 dias. O web sempre manda os dois lados, então só a chamada direta chega aqui | Recusar quando só um lado vem; na janela padrão, subtrair `dias - 1` | `pacientes.test.ts`: só `de` dá 400; `?dias=7` traz no máximo 7 dias | — |
| TOK-01 | baixa | verificado | não conferido | `verificarToken` aceita o token de um usuário apagado | `src/routes/auth.ts:50` | Depois de um DELETE manual do usuário, o token de 1 dia continua valendo. As leituras voltam vazias e o POST `/checkin` dá 500 por violação de FK. Não vaza dado | Sem linha do usuário, responder 403 "Sessão encerrada" | `auth.test.ts`: logar, apagar o usuário pelo dono, chamar uma rota: 403 | — |
| SEED-01 | baixa | provável | não conferido | O seed cifra com a chave do `.env.test`, e a trava compara só o hostname | `scripts/seed-dev.ts:185` | Se o servidor publicado usar outra `ENCRYPTION_KEY`, as emoções e o diário da demo saem vazios na frente da banca, sem erro visível. A trava do seed não olha o nome do banco, ao contrário da trava da suíte | No A5, rodar o seed com a mesma chave do servidor publicado e conferir o painel antes da banca. Na trava, comparar host e nome do banco | Depois do seed na demo, GET `/psicologo/checkins` traz emoções não nulas | A5 |

## Refutados

Nenhum achado deste setor. As refutações de partes de outros setores estão na tabela abaixo.

## Contradições entre setores, resolvidas pelo código

| # | Setores | Conflito | Resolução |
|---|---|---|---|
| 1 | Corretude (linha 30 da tabela de corridas) contra segurança K-01 e conformidade LGPD-05 | A corretude diz que o psicólogo só lê o diário com `compartilha_diario` | Falso. A leitura usa só a marcação `diario_compartilhado` do check-in (`psicologo/pacientes.ts:199-204`, `psicologo/checkins.ts:209-210`). A corrida com o "parar" vale de verdade: virou o DIA-01 |
| 2 | Corretude FUSO-01 (alta) contra complexidade QUAL-02 ("hoje o desvio não existe") | Falha hoje ou só depois do A3? | São caminhos diferentes. Entre as janelas SQL não há desvio hoje. O web manda `de` e `ate` no dia do navegador contra a coluna gravada em UTC, e isso já falha das 21h às 24h. Severidade única: alta e provável. São 6 ocorrências de `CURRENT_DATE` em 5 consultas |
| 3 | IDEM-05, DES-03 e DES-06 ("até 35 s") contra os verificadores de DES-03 e DES-06 | Teto do envio de e-mail | Valem os verificadores, que leram o nodemailer 10.2.1. Conexão, saudação e STARTTLS dividem 10 s, e os 15 s do socket contam inatividade por etapa. Porta bloqueada falha em cerca de 10 s; um SMTP lento pode passar de 35 s |
| 4 | Complexidade ("`auth-psicologo.ts` não tem try nenhum") | — | Errado: há 4 blocos `try {` |
| 5 | RACE-02, DES-05 e VIN-01 | Três achados sobre o rate limit em memória | São o mesmo item de `levantamento/server_arquitetura.md`. Só as colunas `tentativas_falhas` e `bloqueio_acesso` sem uso são novidade. Contar como um item só |
| 6 | AUD-01 e LGPD-06 | Leituras sem auditoria | Duplicados entre si e com `levantamento/docs_afirmacoes.md`. A visita ao paciente pelo web sempre fica registrada. Sobram as listas e o acesso direto pela API. Baixa |
| 7 | LGPD-09 (marcado como novo) | — | Já conhecido: `levantamento/server_dados.md` e `server_arquitetura.md` |
| 8 | CFP-01 | — | Duplicado inteiro de `levantamento/conferencia_resto.md` e F-C1-3 |
| 9 | Frases 3 e 6 da conformidade contra RLS-04, K-01 e LGPD-09 | "Toda consulta confere o consentimento no banco" e "toda mudança fica registrada" | Corrigidas em [`server-conformidade.md`](server-conformidade.md). Quem confere o consentimento é o código das rotas, não a RLS. O consentimento padrão gravado no vínculo não gera evento, e a auditoria roda depois do COMMIT |
| 10 | SEG-03 ("a correção não resolve o bloqueio") | — | O bloqueio vem do `/auth/registro`, não do `/registro-psicologo`. Virou o CAD-01 |

## Correções que se anulam entre si

- **DES-05 contra OTP-01.** Ligar `skipSuccessfulRequests` no login do psicólogo libera um e-mail de 2FA por acerto. Aplicar só em `/auth/login`.
- **IDEM-03 contra a detecção de reuso.** Aceitar o refresh anterior por 60 s enfraquece a detecção de reuso do refresh. Se for feito, documentar como troca consciente.
- **IDEM-07 contra SEG-01, SEG-02 e K-04.** Manter a linha do código depois do uso aumenta a janela de reuso. Preferir a saída pelo app ("Já confirmou? Entrar").
- **SEG-03 e DES-03 contra "não mexer no `/registro-psicologo` antes de 05/12" (complexidade).** O SEG-03 só muda a resposta (201 mais aviso) e cabe sem tirar o SMTP da transação. O DES-03 é a reestruturação, que fica abaixo da linha de corte, a menos que o A4 mostre latência.
- **A6 contra CAD-01.** Recusar psicólogo no `/auth/login` sem corrigir `auth.ts:176` torna o bloqueio permanente. Fazer o CAD-01 junto do A6 ou antes.

## Partes do server sem dono

- **Cálculos:** conferidos aqui e corretos (lista no resumo). Fica de fora `gerarPercepcao` (`checkin.ts:79-160`), que sorteia frases com `Math.random` e não tem teste.
- **`docs/escalas.md`:** as pendências de redação e de validação (por exemplo, o GAD-7 validado em Portugal) não foram abertas por nenhum setor.
- **Variáveis de ambiente:** as chaves de `.env.example` batem com as que o código lê. A exceção é `VALIDAR_MX`, que nunca é lida (QUAL-06).
- **`GRANT ... DELETE ON ALL TABLES` (`0003:13`):** um DELETE de usuário pelo papel da aplicação cascatearia por cima da RLS. Hoje nenhuma rota faz isso.

## O que não foi coberto

- Nada foi executado. O DIA-01 e as corridas foram analisados pelas regras do READ COMMITTED, sem teste.
- `scripts/seed-dev.ts` foi lido só nos trechos citados (`:1-40`, `:185-191`, `:280-300`). `scripts/migrar.ts` foi lido inteiro, sem achado novo além do runner sem lock, que já é conhecido.
- As asserções de `test/` não foram revisadas, só os nomes e os trechos citados.
- A lógica de `gerarPercepcao` não foi conferida.
- O fuso do Neon e a `ENCRYPTION_KEY` do deploy não foram conferidos.
- Web e mobile foram lidos só para resolver contradições.
- A contagem de 61 handlers foi comparada com a matriz por amostragem, não linha a linha.
