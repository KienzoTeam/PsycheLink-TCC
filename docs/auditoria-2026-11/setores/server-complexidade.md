# Server: complexidade e separação (revisão de 12/11/2026)

Leitura estática do commit `a630eae`. Nada foi executado: nem `tsc`, nem a suíte, nem ferramenta de medir complexidade. Os tamanhos de função foram contados abrindo o código. Cada achado passou por um verificador, que releu o código.

Os 10 maiores arquivos, a duplicação e o candidato número 1 a refatorar estão em [`../05-separacao.md`](../05-separacao.md). Este arquivo traz só os achados.

## Termos usados

- **Refatorar**: mudar a forma do código sem mudar o que ele faz.
- **Teste de caracterização**: teste que fixa o comportamento atual antes de mexer, para a refatoração ter um sinal vermelho ou verde.
- **Predicado**: um trecho de SQL reutilizável que responde sim ou não, como "este check-in é visível a este psicólogo?".
- **Cast**: forçar o TypeScript a aceitar um tipo; ele deixa de conferir.

## Resumo

`apps/server/src` tem 4.948 linhas. Três arquivos antigos concentram o código feito à mão: `checkin.ts` (415), `auth.ts` (451) e `auth-psicologo.ts` (411). Nenhum deles usa `rota()` nem `lerOuNegar`, cada um tem o seu próprio `limite()`, e 40 das 50 chamadas de consulta deles não declaram o tipo da linha. O lado do psicólogo é longo, mas uniforme.

A complexidade real está em quatro lugares:

- o `/checkin/painel`;
- o laço de varredura de `psicologo/checkins.ts`;
- o `/registro-psicologo`, com BEGIN e ROLLBACK à mão e o SMTP dentro da transação;
- o `/refresh`.

Três achados não estavam no levantamento:

1. **QUAL-01:** a "média duplicada" do checklist E é uma armadilha. A cópia local converte o sono com `Number()`, e a de `lib/estatistica` não, então trocar uma pela outra quebra o sono médio da home.
2. **QUAL-02:** o A3 vai deixar 6 `CURRENT_DATE` do lado do psicólogo fora do fuso de São Paulo, em arquivos que não estão na lista dele.
3. **QUAL-03:** o A7 precisa mexer em 13 consultas de check-in, escritas em 3 formatos diferentes.

O candidato número 1 a refatorar é um predicado único "check-in visível ao psicólogo", feito dentro do A7.

Correção feita pelo setor crítico: a entrega original dizia que `auth-psicologo.ts` não tem nenhum `try`. Tem 4 (`rg -c 'try {'`). O BEGIN/ROLLBACK manual fica em `:305-410`.

## Achados mantidos

Legenda do veredito: **confirmado** = o verificador refez o caminho; **provável** = o caminho fecha, mas depende de algo não medido (aqui, o fuso do Neon); **não conferido** = o verificador não chegou a esse achado.

| Id | Sev. | Confiança | Veredito | Título | Onde | Cenário | Correção | Teste | Lote |
|---|---|---|---|---|---|---|---|---|---|
| QUAL-02 | média | provável | provável | O A3 muda o dia do check-in para São Paulo, mas 6 janelas do psicólogo continuam em `CURRENT_DATE` | `src/routes/psicologo/dashboard.ts:71` | Se o A3 mudar só a gravação, das 21h às 24h a janela de 7 dias perde o dia mais antigo, e `registros7d`, o status "esparso" e as médias mudam conforme a hora em que a banca abre o painel. O mesmo handler já mistura as duas convenções (`:89` e `:146` usam São Paulo) | Uma constante só para "hoje em São Paulo" em `lib/checkins.ts`, usada nas 6 ocorrências e no DEFAULT da coluna. `MIN_REGISTROS_SEMANA` vai para o mesmo lugar. Não usar `ALTER ROLE ... timezone` | Check-in em "hoje − 6" conta em `registros7d`. Guarda no CI: `rg 'CURRENT_DATE' apps/server/src` sem resultado (não pega `test/ajuda.ts:151`) | A3 |
| QUAL-03 | média | verificado | confirmado | O A7 precisa mudar 13 consultas de check-in em 3 formatos | `src/routes/psicologo/dashboard.ts:39` | Formato 1: JOIN em `vinculo` no próprio SQL. Formato 2: subconsulta presa ao vínculo da consulta externa. Formato 3: só `paciente_id`, sem vínculo no escopo. A regra "desde o vínculo" só existe hoje para a auditoria. Se o A7 esquecer um sítio, o psicólogo B vê a última emoção registrada com o A, e só a RLS segura | Commit 1, sem mudar comportamento: centralizar `CHECKINS_COM_HUMOR`. Commit 2: o predicado com a data do vínculo, e `desde` obrigatório em `checkinsDoPeriodo` para o `tsc` apontar os chamadores. As duas colunas são timestamp em UTC e comparam direto | Em `defesa-sem-rls.test.ts` (roda como dono): check-in de antes do vínculo não aparece em nenhuma das 8 rotas. O rg do PR devolve 15 linhas: 13 sítios mais as 2 da definição | A7 |
| QUAL-01 | baixa | verificado | confirmado | Deduplicar `media()` como pede o checklist E quebra o sono médio do painel | `src/routes/checkin.ts:45` | `horas_sono` é `numeric` e chega como texto (`'7.50'`), mas o tipo diz `number` e um cast esconde isso. Com a média de `lib/estatistica`, 2 check-ins viram `'07.508.00'`, a conta dá NaN e o sono some da home. Com 1 check-in funciona, o que esconde o erro num teste manual | Tipar como `string`, converter na leitura e trocar os casts por `client.query<T>`. Só depois deduplicar | GET `/checkin/painel` com 2 check-ins (7 h e 8 h) devolve 7.5. Hoje não há teste do painel | — |
| QUAL-04 | baixa | verificado | não conferido | `lerOuNegar` descarta a mensagem do zod; por isso há 6 cópias de `safeParse` | `src/lib/rota.ts:42` | Migrar o check-in para `lerOuNegar` como está deixaria vermelho o teste "emocoes vazias explicam o motivo", e migrar as rotas de auth apagaria as mensagens de senha | Argumento opcional em `lerOuNegar` que devolve a mensagem do campo, com o padrão de hoje | Os testes de corpo recusado continuam verdes depois da troca | A6 |
| QUAL-05 | baixa | verificado | não conferido | Tipos frouxos: `res.locals` sem tipo e 64 de 119 consultas sem tipo de linha | `src/routes/psicologo/index.ts:32` | Um nome de coluna errado passa no `tsc`. Para `psicologoId` o efeito falha fechado (id indefinido não lê nada) | Declarar `Express.Locals`; pôr o genérico nas consultas de `auth*.ts` quando o A6 mexer nelas | `tsc --noEmit` continua verde; um campo inexistente vira erro | — |
| QUAL-06 | baixa | verificado | não conferido | Código morto: aliases `/checkin/checkins*`, `dominioTemMX` e 3 tipos sem uso | `src/routes/checkin.ts:163` | Os aliases não têm chamador no mobile, no web nem nos testes. `VALIDAR_MX` está no `.env.example` e ninguém lê | Tirar os aliases no A6 ou no A3; remover `dominioTemMX`, `VALIDAR_MX` e os 3 tipos | Suíte verde e `rg '/checkins' apps/mobile/src apps/web/src` vazio | A6 |

Já estavam no levantamento de 10/11 e continuam abertos:

- QUAL-01: `levantamento/checklists_desempenho_qualidade_ux.md` bloco E. O checklist recomendava deduplicar sem notar a diferença.
- QUAL-02: a mistura no dashboard já estava em `levantamento/conferencia_resto.md` e `checklists_desempenho_qualidade_ux.md`. São novos `pacientes.ts:81`, `:183`, `resumo.ts:49-50` e a lacuna na lista do A3.
- QUAL-03: o vazamento em si é o A7 (`PLANO.md`). O mapa dos sítios é novo.
- QUAL-04: `levantamento/conferencia_resto.md` (E-C6-1, S6-1) e `conferencia_auth.md` (A-C4-1).
- QUAL-05: `levantamento/checklists_desempenho_qualidade_ux.md` bloco E.
- QUAL-06: `levantamento/server_arquitetura.md` §4.

Nota do verificador sobre o QUAL-01: hoje nada falha. O defeito só aparece se alguém fizer a deduplicação que o checklist sugere. É dívida de manutenção, por isso fica em baixa.

## Refutados

Nenhum.

## O que não foi coberto

- Não foram lidos linha a linha: `paciente/escalas.ts`, `paciente/vinculo.ts`, `paciente/consentimento.ts`, `paciente/consultas.ts`, `psicologo/conta.ts`, `psicologo/vinculo.ts` e `psicologo/auditoria.ts` (só grep e trechos).
- `lib/escalas.ts`, `lib/mailer.ts`, `lib/criptografia.ts`, `lib/cursor.ts` e `lib/periodo.ts` ficaram fora (estão fora do top 10).
- Nada foi executado. A complexidade cognitiva foi estimada lendo o código.
- O NaN do QUAL-01 foi deduzido das regras do JavaScript e do tipo `numeric` do pg, sem execução.
- O QUAL-02 depende do fuso do Neon, que não foi medido.
- `test/` e `scripts/seed-dev.ts` foram vistos só por grep.
