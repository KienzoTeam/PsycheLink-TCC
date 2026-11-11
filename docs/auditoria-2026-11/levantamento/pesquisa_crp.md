# Pesquisa: validação de CRP

> Levantamento em modo leitura, 10 e 11/11/2026. Agente `pesquisa_crp`, Opus 5.5 (effort high). Nada foi executado além de leitura de código, `npm view/audit/outdated` e documentação pública; "verificado" quer dizer lido no código, não testado. Linhas citadas são do commit `0864143`.

## Resumo

Verifiquei no código do próprio portal que existe consulta pública oficial (cadastro.cfp.org.br): busca por nome, CPF ou número de registro, e o resultado traz nome, número, região, data de inscrição e situação. Não há API oficial documentada para consulta individual. O front chama um backend interno (cn-api.cfp.org.br/psi/busca) protegido por reCAPTCHA v3. A API de dados abertos do CFP só publica a quantidade de profissionais por regional. Encontrei dois provedores comerciais verificáveis: Infosimples (pré-pago, franquia mínima de R$ 100/mês, R$ 100 de crédito grátis por 30 dias, cerca de R$ 0,20 por consulta na primeira faixa) e Netrin (só aceita CPF, preço sob consulta). Um conector MCP de terceiros aparece como inativo. Hoje o servidor só valida o formato e não existe papel de administrador. Recomendo a opção (a) com o link opcional da opção (b): situação "pendente", conferência manual por um admin no portal oficial e bloqueio do código de vínculo até a verificação. A API paga fica como trabalho futuro. A raspagem (d) não deve ser feita.

## Recomendação

Implementar a opção (a) com o campo de link opcional da (b). Colunas em psicologo: crp_situacao ('pendente','verificado','rejeitado', default 'pendente'), crp_verificado_em timestamptz, crp_verificado_por FK users(id), crp_fonte ('manual' por enquanto), crp_observacao e crp_link_comprovante opcional. Criar um papel de admin mínimo (users.admin boolean) com uma rota que lista os pendentes e outra que aprova ou rejeita, gravando auditoria 'crp_verificado'/'crp_rejeitado'. Fazer exigirPsicologo (src/routes/psicologo/index.ts:24) devolver a situação e bloquear POST /psicologo/vinculo enquanto ela não for 'verificado', que é o que o documento do TCC pede ("Psicólogo autenticado com CRP validado. Solicitação de geração de código"). Restringir a região a 01–24 no zod do servidor e do web. Não contratar a API paga agora. Se a banca pedir automação, criar a interface VerificadorCrp só quando a integração for de fato feita, com modo simulado na demonstração. Não automatizar o portal do CFP.

## Relatório

## Verificação do CRP: pesquisa e opções (2026-11-10)

### Estado atual (verificado)
- `apps/server/src/schemas.ts:62-67` só aceita o formato `/^\d{2}\/\d{5,6}$/`. O mesmo regex está no web, em `apps/web/src/rotas/auth/validacao.ts:78`. Hoje aceita região `00` e de `25` a `99`.
- `src/routes/auth-psicologo.ts:336-344` bloqueia o reuso de um CRP que já pertence a uma conta com e-mail verificado. A coluna `psicologo.crp` não tem UNIQUE (`migrations/0001_baseline.sql:325`).
- Não há coluna de situação do CRP nem papel de admin: a busca por `admin`, `papel` e `role` em `src/` e `migrations/` não achou nada. `users` não tem CPF.
- `exigirPsicologo` (`src/routes/psicologo/index.ts:24-38`) só confere se existe uma linha em `psicologo`.
- O documento do TCC (`Documento_mesclado_e_formatado.pdf`, linhas 920-923 e 2036-2039 do pdftotext) exige "cadastro ativo com CRP validado" para gerar o código de vínculo.

### 1. Consulta oficial do CFP
- **Verificado (página do CFP).** O Cadastro Nacional de Profissionais de Psicologia fica em https://cadastro.cfp.org.br/. A página do CFP orienta usá-lo para checar se o registro está ativo, com busca por nome, CPF ou número de registro (site.cfp.org.br/fale-conosco/outras-questoes/como-saber-se-uma-pessoa-e-psicologo/).
- **Verificado (li o JS público `assets/js/cn-pesquisa-provisoria.js`).**
  - O front é em Vue e chama `https://cn-api.cfp.org.br/psi/busca` e `/psi/buscarComCodigo`.
  - O resultado mostra Nome, Nº de registro, Região (`nomeregional`), Data de Inscrição e Situação. O "ativo" é identificado por `situacao.toLowerCase()=="ativo"`, e há um "Histórico de registros".
  - A busca usa **reCAPTCHA v3** (`$recaptcha("pesquisaProvisoria")`, `form.recaptchaToken`).
  - Existe um link de detalhe no formato `visualizar.html?profissional=<id>`.
  - Um GET sem parâmetros na API devolveu 422. Não fiz consultas reais, para não contornar o captcha.
- **API oficial: não existe para consulta individual (verificado).** O Swagger de dados abertos do CFP (`transparencia.cfp.org.br/.../swagger_psicologa_01.yaml`) só tem concursos, testes psicológicos, **quantidade** de profissionais por regional e uma página de denúncia.
- **Termos de uso: não encontrados.** `/termos-de-uso.html`, `/termos.html` e `/privacidade.html` devolvem 404, e a home não tem link para termos. O captcha mostra que a intenção do CFP é impedir automação.
- O CRP-10 informa as situações ativo, cancelado e transferido. Blogs citam também suspenso e indeferido, o que é suspeito porque não vem de fonte oficial.

### 2. APIs comerciais
| Provedor | Entrada | Retorno | Preço / exigência | Status |
|---|---|---|---|---|
| Infosimples `cfp-cadastro` | cpf, cnpj, uf, nome, registro | data_inscricao, nome, nome_regional, registro, situacao | Pré-pago, sem adesão, R$ 100 grátis por 30 dias, **franquia mínima de R$ 100/mês** quando há uso. Faixa 1-500: R$ 0,20 por consulta, mais um adicional variável. "Nada consta" é cobrado. | verificado |
| Netrin (API CFP) | só CPF | nome, regional, registro, situação | Preço sob consulta, teste grátis via formulário | verificado (página) |
| Conector MCP `cfp_cadastro` (mcp.ai) | ? | ? | Carteira pré-paga. A página o marca como "Inactive" e "Outdated data", e os dados passam pelo LLM do usuário. | não recomendado |
| Burocrata | ? | ? | Página deu 502 | não verificado |
| Direct Data | — | — | Tem CONFEA, mas `/catalogo/CFP` e `/catalogo/CRP` dão 404 | sem produto CFP encontrado |

Esses provedores consultam a mesma fonte oficial. A forma como lidam com o captcha não está documentada.

### 3. Aspectos legais e éticos
- **LGPD art. 7º §3º (verificado no Planalto):** dado de acesso público deve ser tratado respeitando "a finalidade, a boa-fé e o interesse público" que justificaram sua divulgação. Conferir se um profissional está habilitado é compatível com a finalidade do cadastro público, que é proteger o cidadão do exercício ilegal. O §7º permite nova finalidade legítima e específica.
- **Minimização:** guarde só a situação, a data, a fonte e quem verificou. Não guarde a resposta inteira do provedor. Não passe a coletar CPF: a Netrin exige CPF, a Infosimples aceita registro + UF.
- **Provedor pago:** ele é operador e recebe nome e CRP. Isso precisa aparecer na política de privacidade e exige contrato de operador.
- **Raspagem:** contornar o reCAPTCHA é antiético, frágil (o portal pode mudar ou bloquear) e indefensável diante da banca. Não há termo de uso explícito, mas o captcha deixa clara a vontade do titular do sistema.

### 4. Opções de desenho
| | Esforço | Custo | Risco na banca | O que mostrar |
|---|---|---|---|---|
| **(a)** Formato + região 01-24 + situação "pendente" + conferência manual por admin | Baixo: 1 migration, 2 rotas de admin, 1 tela, bloqueio no vínculo | R$ 0 | Baixo | Cadastro "em análise", admin abre o portal do CFP, aprova, auditoria gravada, código de vínculo liberado |
| **(b)** (a) + link de comprovante | Baixo, +1 campo | R$ 0 | Baixo | Psicólogo cola o link `visualizar.html?profissional=…` e o admin confere. Evite upload de carteira (foto e CPF são dado pessoal a mais). |
| **(c)** Adapter + feature flag + modo simulado | Médio: interface, cliente HTTP, tratamento de erros e timeout, segredo | Franquia de R$ 100/mês quando usada. O crédito grátis cobre só 30 dias. | Médio: rede, crédito e mudança do provedor. Na demonstração, use o modo simulado. | Troca `manual`/`simulado`/`infosimples` por variável de ambiente |
| **(d)** Automação do portal oficial | Alto | R$ 0 | Alto: captcha, ética, pode quebrar ao vivo | Nada defensável |

### 5. Recomendação e mudanças
Recomendo **(a) com o link opcional de (b)**. Esse desenho atende "CRP registrado e validado" com verificação humana auditada, que se defende melhor diante da Resolução CFP e da LGPD do que uma automação frágil. A opção (c) fica descrita como trabalho futuro e só é implementada se a banca exigir automação.

**Modelo (migration 0008, ou no schema Prisma se a migração acontecer antes):**
- Em `psicologo`:
  - `crp_situacao text NOT NULL DEFAULT 'pendente' CHECK (crp_situacao IN ('pendente','verificado','rejeitado'))`
  - `crp_verificado_em timestamptz`
  - `crp_verificado_por integer REFERENCES users(id)`
  - `crp_fonte text` (`'manual'`)
  - `crp_observacao text`
  - `crp_link_comprovante text`
- Considerar um índice UNIQUE parcial em `crp` quando `crp_situacao='verificado'`.
- Admin: `users.admin boolean DEFAULT false`, preenchido por seed.
- Auditoria: `crp_verificado` e `crp_rejeitado`.

**Servidor:**
- Região 01-24 no zod. A quantidade de 24 regionais vem de uma página do CFP vista só em resultado de busca.
- `exigirPsicologo` passa a expor a situação. `POST /psicologo/vinculo` (`vinculo.ts:16`) devolve 403 se a situação não for `verificado`.
- Rotas `/admin/crp` (GET pendentes, POST decisão).

**Telas:**
- Web: aviso "CRP em análise" no cadastro e no dashboard; botão de gerar código desabilitado com explicação; página de admin com fila de pendentes, botão "Abrir no Cadastro Nacional" (nova aba), aprovar/rejeitar com observação.
- Mobile: nenhuma mudança, porque o paciente só vê psicólogos já verificados pelo vínculo.

## Riscos

- Na opção (c), uma chamada ao vivo durante a banca pode falhar (rede, crédito esgotado, provedor fora do ar). O modo simulado precisa ser o padrão na demonstração.
- A franquia mínima da Infosimples (R$ 100/mês) é debitada em qualquer mês com uso, mesmo que pequeno.
- A opção (d) exige contornar o reCAPTCHA v3: risco ético, de bloqueio de IP e de quebra quando o portal mudar.
- Bloquear o vínculo enquanto o CRP está pendente afeta as contas de teste e o seed. Elas precisam nascer como 'verificado'.
- Sem UNIQUE em psicologo.crp, dois psicólogos pendentes podem declarar o mesmo CRP. O admin precisa ver esse conflito.
- Criar um papel de admin aumenta a superfície de autorização: a rota precisa de exigirSessaoWeb mais a checagem de admin, além de auditoria.

## Incertezas

- A lista oficial de situações possíveis não foi confirmada. O CRP-10 cita ativo, cancelado e transferido; suspenso e indeferido aparecem só em blogs.
- As 24 regionais (01-24) vieram de uma página do CFP vista apenas em resultado de busca, e não confirmei o mapeamento de todas as UFs. Não encontrei documentação de dígito verificador do CRP; suspeito que não exista.
- Não sei se o número de registro pode ter outro tamanho ou sufixo além de 5-6 dígitos; o formato atual não foi conferido em fonte oficial.
- Não encontrei o preço específico da consulta cfp-cadastro na Infosimples: a tabela de faixas é geral e o adicional por consulta não aparece na página.
- Preço e exigências da Netrin não são públicos. A página do Burocrata deu 502 e não foi verificada.
- Não sei como os provedores lidam com o reCAPTCHA do portal, nem se têm acordo com o CFP.
- Não confirmei a ausência de termos de uso além das URLs testadas e da home; pode existir um documento em site.cfp.org.br.
- Não fiz consulta real na cn-api; o formato exato da resposta foi deduzido do JS do front.
- O enquadramento jurídico da raspagem não foi pesquisado em jurisprudência; o argumento contra é ético e técnico.

## Fontes

- https://site.cfp.org.br/fale-conosco/outras-questoes/como-saber-se-uma-pessoa-e-psicologo/ (acesso 2026-11-10)
- https://cadastro.cfp.org.br/ e https://cadastro.cfp.org.br/assets/js/cn-pesquisa-provisoria.js (lidos via curl em 2026-11-10)
- https://transparencia.cfp.org.br/crp10/pergunta-frequente/busca-de-informacoes-sobre-os-profissionais-registrados/ (2026-11-10)
- https://transparencia.cfp.org.br/crp01/dados-abertos/colecoes-disponiveis/ e https://transparencia.cfp.org.br/wp-content/themes/transparencia/inc/swagger/arquivos-swagger/swagger_psicologa_01.yaml (2026-11-10)
- https://infosimples.com/consultas/cfp-cadastro/ (2026-11-10)
- https://infosimples.com/consultas/precos/ (2026-11-10)
- https://netrin.com.br/api/cfp-conselho-federal-de-psicologia (2026-11-10)
- https://glama.ai/mcp/servers/mcp-dir/cfp_cadastro-mcp (2026-11-10)
- https://www.directd.com.br/central-de-ajuda/apis/catalogo/CONFEA (resultado de busca; /CFP e /CRP deram 404 em 2026-11-10)
- https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm (LGPD art. 7º §§3º,4º,7º, 2026-11-10)
- apps/server/src/schemas.ts:59-74
- apps/server/src/routes/auth-psicologo.ts:294-372
- apps/server/src/routes/psicologo/index.ts:24-49
- apps/server/src/routes/psicologo/vinculo.ts:16
- apps/server/migrations/0001_baseline.sql:322-328,387-398
- apps/web/src/rotas/auth/validacao.ts:74-78
- docs/revisao-por-pares.md:46,99
- TCC_PsycheLink/Documento_mesclado_e_formatado.pdf (linhas pdftotext 920-923, 2036-2039)
