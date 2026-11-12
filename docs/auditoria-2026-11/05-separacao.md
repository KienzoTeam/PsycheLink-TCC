# Separação de responsabilidades

Parte do server: leitura estática do commit `a630eae`. Nada foi executado: nem `tsc`, nem a suíte, nem ferramenta de medir complexidade. Os tamanhos vêm de `wc -l` e da contagem entre a abertura e o fechamento de cada `router.x(`. A complexidade foi estimada lendo o código. Os ids apontam para [`setores/server-complexidade.md`](setores/server-complexidade.md).

## Termos usados

- **Separação de responsabilidades**: cada parte do código cuida de uma coisa. Neste server há três camadas misturadas:
  - **H**, receber a requisição e montar a resposta (*handler*);
  - **R**, a regra de negócio (médias, limiares, frases);
  - **S**, o SQL ou um serviço externo, como o e-mail.
- **Complexidade cognitiva**: o quanto é difícil seguir o código de cabeça. Cresce com laços, condições aninhadas, saídas antecipadas e variáveis que mudam de valor.
- **Refatorar**: mudar a forma do código sem mudar o que ele faz.
- **Teste de caracterização**: teste que fixa o comportamento atual antes de mexer.

## 1. Os 10 maiores arquivos de `apps/server/src`

`src` tem 4.948 linhas no total.

| # | Arquivo | Linhas | Mistura | Funções com mais de cerca de 60 linhas | Complexidade cognitiva |
|---|---|---|---|---|---|
| 1 | `routes/psicologo/pacientes.ts` | 490 | H, R e S. A regra fica em `resumirPeriodo` (`:206`), na correlação (`:217-221`) e no diário (`:199-204`); 7 consultas no arquivo, uma delas um UNION de 6 SELECTs | lista `:48-131` (84), resumo `:153-242` (90), linha do tempo `:277-391` (115) | Média. O resumo tem 2 consultas condicionais dentro da transação. A linha do tempo é longa, mas reta |
| 2 | `routes/auth.ts` | 451 | H, R, S e SMTP. Também guarda o middleware `verificarToken` (`:34`), que outras rotas importam | `/registro` `:144-218` (75) | Alta no `/registro`: lock, condição tripla e `try` aninhado do envio. 9 handlers com `try` manual; 19 de 20 consultas sem tipo |
| 3 | `routes/checkin.ts` | 415 | Tudo junto: H, R (`gerarPercepcao`, médias, corte semanal), S e cifra | `gerarPercepcao` (82, sorteia frase com `Math.random`), `/painel` `:282-416` (135) | **A mais alta do server.** O `/painel` abre 2 transações, tem 2 saídas antecipadas, cerca de 6 ternários de arredondamento e o corte de data no fuso do processo. Sem `rota()`, sem `lerOuNegar` e sem teste |
| 4 | `routes/auth-psicologo.ts` | 411 | H, R (2FA, rotação de refresh), S e SMTP | login `:47-122` (76), `/refresh` `:221-281` (61), `/registro-psicologo` `:294-411` (118) | Alta no `/registro-psicologo`: BEGIN à mão com ROLLBACK em 4 saídas e o envio de e-mail dentro da transação. O arquivo tem 4 blocos `try` |
| 5 | `routes/psicologo/escalas.ts` | 264 | H e S; a regra fica em `lib/escalas.ts` | nenhuma | Baixa |
| 6 | `routes/psicologo/relatorios.ts` | 261 | H e S; a regra fica em `lib/resumo.ts`. Importa `perfilDe` de uma rota irmã (`conta.ts`) | `/geral` `:73-145` (73), `/pacientes/:id` `:147-231` (85) | Baixa: reto, 4 consultas condicionais |
| 7 | `routes/psicologo/consultas.ts` | 245 | H e S; a regra de duração está no schema | nenhuma | Média no remarcar (lock, UPDATE, INSERT e tratamento de conflito), bem comentado |
| 8 | `routes/psicologo/checkins.ts` | 220 | H, S e R (filtro de emoção depois de decifrar) | lista `:60-137` (78), detalhe `:153-220` (68) | **Alta na lista:** `while` com `for`, `continue` e `break`, 4 variáveis de estado e 2 regras de próximo cursor |
| 9 | `routes/psicologo/dashboard.ts` | 198 | H e S (8 consultas), quase nenhuma R | handler `:57-198` (142) | **Baixa apesar do tamanho:** 8 consultas em sequência e um mapeamento, sem ramos |
| 10 | `lib/sessaoWeb.ts` | 160 | S, cookies e 2 middlewares (aceitável para o módulo de sessão) | nenhuma | Baixa |

Só `lib/resumo.ts`, `lib/escalas.ts`, `lib/estatistica.ts` e `lib/habitos.ts` tiram regra de dentro das rotas. Não existe camada de repositório: o SQL fica no próprio handler e passa por `comContexto*`, que é o que garante o contexto da RLS dentro da transação. Não vale criar um repositório antes da banca.

## 2. Duplicação, estilos concorrentes, código morto e tipos

### Duplicação real

- `limite()` redefinido 3 vezes (`auth.ts:17`, `auth-psicologo.ts:35`, `checkin.ts:13`) contra `lib/rota.ts:6`. Lote A6.
- `safeParse` com a mensagem do primeiro erro copiado em 6 lugares. A causa é `lerOuNegar` fixar "Dados inválidos." (QUAL-04, A6).
- Decifrar, separar e contar emoções: 2 cópias no mesmo `checkin.ts` (`:251-267`, `:360-375`), quando `lib/checkins.ts:28` e `lib/resumo.ts:79-88` já fazem isso.
- `media` (`checkin.ts:61` e `estatistica.ts:1`) e `QUALIDADE_SONO_REVERSO` (`checkin.ts:21` e `lib/checkins.ts:3`). **Não é duplicata limpa:** ver QUAL-01.
- SQL de gravar o código de e-mail: `auth.ts:98-108` e `auth-psicologo.ts:387-396`.
- Filtro "check-in visível ao psicólogo": 13 sítios em 3 formatos (QUAL-03, A7).
- Janela de 7 dias `CURRENT_DATE - 6` (`dashboard.ts:71`, `pacientes.ts:81`, `:183`) e `MIN_REGISTROS_SEMANA = 3` (`dashboard.ts:10`, `pacientes.ts:19`). QUAL-02, A3.
- Decifrar anotações e descartar as nulas: `pacientes.ts:444-446` e `relatorios.ts:224-227`. Pequeno; deixar como está.

### Dois estilos concorrentes

- **Tratamento de erro:** `rota()` em 15 arquivos (`paciente/*`, `psicologo/*`). `try` manual em `auth.ts` (14), `checkin.ts` (5), `auth-psicologo.ts` (4) e `psicologo/index.ts:25`. A entrega original dizia que `auth-psicologo.ts` não tinha nenhum `try`; o setor crítico contou 4.
- **Transação:** `emTransacao` e `comContexto*` em todo lugar, menos `auth-psicologo.ts:305-410` (BEGIN e ROLLBACK à mão).
- **Autenticação:** `verificarToken` mora numa rota (`routes/auth.ts:34`), importada por outras rotas. `exigirSessaoWeb` mora em `lib/sessaoWeb.ts:112`.
- **Erro do pg:** `instanceof DatabaseError` em 4 rotas e `err: any` em `checkin.ts:213`.
- **Nomes repetidos com sentidos diferentes:**
  - `vinculoAtivoDe` é um trecho de SQL em `lib/vinculo.ts:23` e uma função em `paciente/vinculo.ts:18`;
  - `LinhaDetalhe` existe em `lib/resumo.ts:6` e em `psicologo/checkins.ts:139`, com formatos diferentes.

### Código morto (QUAL-06)

- os aliases `/checkin/checkins*`, sem chamador no mobile, no web ou nos testes;
- `dominioTemMX` e `VALIDAR_MX`;
- os tipos `DadosCheckin`, `DadosRegistro` e `DadosRegistroPsicologo`, de `schemas.ts`;
- as tabelas `alerta`, `mensagem` e `resposta_escala`: não têm rota, mas estão documentadas em `docs/rls.md`, e `resposta_escala` ainda é testada em `rls.test.ts`.

### Tipos frouxos (QUAL-05)

- `any` explícito só em `checkin.ts:213`.
- O que pesa é o implícito:
  - 64 de 119 chamadas `query(` sem tipo de linha;
  - `res.locals.psicologoId` sem tipo em 55 usos;
  - os casts de `checkin.ts:243`, `:307` e `:316`, e um deles esconde o tipo errado de `horas_sono` (QUAL-01);
  - `JSON.parse(...) as number[]` em `psicologo/escalas.ts:236`.

## 3. Candidato número 1 a refatorar

Critérios:

- **(a)** os testes de hoje fixam o comportamento, então a equipe tem sinal vermelho e verde;
- **(b)** um lote da fila já precisa editar todas as cópias, então refatorar diminui a superfície em vez de abrir outra frente.

**Escolhido: o predicado único "check-in visível ao psicólogo", feito dentro do A7.**

- **(a) passa.** `pacientes.test.ts`, `relatorios.test.ts`, `defesa-sem-rls.test.ts`, `rls.test.ts` e `checkin.test.ts` (leitura pelo psicólogo) já batem nessas rotas.
- **(b) passa.** O A7 tem que mudar os 13 sítios de qualquer jeito (QUAL-03). Esquecer um deles é vazamento de dado sensível. Com o predicado, 13 edições à mão viram 1 regra e 13 usos que um `rg` confere.

Esboço, sem código:

1. **Commit 1, sem mudar comportamento.** Mover `CHECKINS_COM_HUMOR` de `dashboard.ts:39` para `lib` e usar em `checkins.ts:82-87` e `:171-177`. A suíte tem que continuar verde.
2. **Commit 2, a regra do A7, com teste vermelho antes.**
   - Pôr a data do vínculo em `vinculoOuNegar`.
   - Criar um predicado em `lib/vinculo.ts` para os formatos 1 e 2.
   - Tornar `desde` obrigatório em `checkinsDoPeriodo`, para o `tsc` apontar os 2 chamadores.
   - Aplicar o mesmo filtro nas 3 consultas soltas de `pacientes.ts`.
   - As duas colunas de data são timestamp em UTC e comparam direto.
3. **O teste.** Em `defesa-sem-rls.test.ts`, que roda como dono e ignora a RLS: um check-in de antes do vínculo não aparece em nenhuma das 8 rotas. O checklist do PR inclui o `rg` por `FROM checkin_diario`. Ele devolve 15 linhas: os 13 sítios mais as 2 linhas da definição da constante.

Por que não ir além disso: o A7 já mexe nesses arquivos. Isso não cria camada nova nem mexe na RLS.

**Segundo colocado: o `/checkin/painel`** (`checkin.ts:282-416` e `gerarPercepcao`).

- O critério (a) falha: não há nenhum teste do painel nem do resumo.
- O (b) passa só em parte: o A3 reescreve o `/resumo`, mas o painel só entra pelo fuso.

Fazer só depois do merge do A3, nesta ordem:

1. teste de caracterização do painel (inativo, sem dados, semana atual contra a anterior, sono com 2 check-ins);
2. extrair uma função pura `montarPainel(linhas, hojeSP)` para `lib`, com a escolha da frase injetável no lugar de `Math.random`;
3. corrigir o tipo de `horas_sono` (QUAL-01).

Sem esse teste, não mexer.

**Não refatorar antes de 05/12:**

- o `/registro-psicologo`: tirar o envio de e-mail da transação muda a garantia "nada gravado se o e-mail falhar". Resolver só se o A4 mostrar latência (DES-03);
- o `dashboard.ts`, que é longo mas reto;
- uma camada de repositório ou o Prisma além do piloto;
- unificar `auth.ts` com `rota()` além do que o A6 já prevê.

## Web e mobile: pendente

A revisão de complexidade e separação do web e do mobile ainda não foi feita (`ESTADO.md`, próximos passos). Do levantamento de 10/11 ficam como ponto de partida:

- `levantamento/web_arquitetura.md`;
- `levantamento/mobile_arquitetura.md`;
- o bloco E de `levantamento/checklists_desempenho_qualidade_ux.md`.
