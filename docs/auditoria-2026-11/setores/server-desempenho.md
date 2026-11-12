# Server: desempenho e robustez (revisão de 12/11/2026)

Leitura estática do commit `a630eae`. Nada foi executado: sem `EXPLAIN`, sem teste de carga, sem medição. Os tempos são estimativas a partir do código e da documentação dos fornecedores. Cada achado passou por um verificador, que releu o código.

## Termos usados

- **Pool de conexões**: um grupo fixo de conexões com o banco (aqui, 10) que as requisições pegam emprestado e devolvem. Se alguém demora a devolver, os outros esperam (**esgotamento do pool**).
- **Cold start**: o serviço gratuito desliga quando fica ocioso, e a primeira requisição espera ele religar.
- **Ida e volta (RTT)**: o tempo de mandar uma consulta ao banco e receber a resposta.
- **Event loop**: a thread única do Node que atende todas as requisições. Um laço síncrono longo faz todo mundo esperar.
- **Índice**: estrutura que leva o banco direto às linhas certas. Sem ele, o banco lê a tabela inteira.

## Resumo

O que está bem:

- Todo bcrypt no caminho da requisição é assíncrono.
- Nenhuma rota pede uma segunda conexão ao pool dentro de uma transação, então não há autotravamento.
- Não há N+1: o servidor não faz uma consulta por linha da lista.
- As listas grandes paginam por cursor.
- Sessões, códigos, desafios e locks ficam no PostgreSQL. O único estado na memória do processo é o rate limit.

O que pesa:

- **DES-02 (novo):** uma queda de conexão com cliente emprestado do pool derruba o processo inteiro. Isso corrige o `levantamento/server_arquitetura.md` §7, que dizia que `pool.on('error')` evitava a queda.
- **DES-03:** o `/registro-psicologo` segura 1 das 10 conexões durante o envio de e-mail. O limite por IP também é 10, então um único IP congela a API sem estourar o limite.
- **DES-01:** o maior risco visível na banca é o cold start do Render Free contra o timeout de 15 s dos clientes. Já está previsto em A4/A5.
- **DES-04:** uma leitura do app faz 6 idas e voltas ao banco, e o dashboard faz 13. Na mesma região são cerca de 20 ms; em continentes diferentes, cerca de 2 s. O repositório não diz a região de nenhum dos dois serviços.

O resto pesa pouco na escala do TCC.

## Achados mantidos

Legenda do veredito: **confirmado** = o verificador refez o caminho; **provável** = o código confere, mas parte depende de dado externo (região, plano, tempo do fornecedor); **não conferido** = o verificador não chegou a esse achado.

| Id | Sev. | Confiança | Veredito | Título | Onde | Cenário | Correção | Teste | Lote |
|---|---|---|---|---|---|---|---|---|---|
| DES-01 | alta | provável | provável | Cold start do Render Free passa do timeout de 15 s dos clientes | `apps/web/src/lib/api.ts:12` e `apps/mobile/src/lib/api.ts:14` | O Render Free dorme após 15 min sem tráfego e leva até cerca de 1 min para subir (documentação do Render, não medido). Se ninguém tocar na API antes da banca, a primeira tela mostra erro de rede. Neste commit não há rota de aquecimento | `/health` do A4 e ping a cada 4 min do A5, ligado só nos ensaios e no dia, pelo menos 2 min antes. Plano B: abrir o `/health` no navegador e esperar o 200 | Depois de 16 min parado, `curl -m 15` no `/health` falha sem o ping e responde em menos de 2 s com ele | A4/A5 |
| DES-02 | média | verificado | confirmado | Queda de conexão com cliente emprestado do pool derruba o processo | `src/lib/contextoseguro.ts:6` | No Node, um evento `error` sem ouvinte encerra o processo. O pg-pool tira o próprio ouvinte quando empresta a conexão. Se ela cair no meio de uma transação (reinício do Neon, rede), o servidor cai e todas as requisições em voo falham | Em `db.ts`: `pool.on('connect', (client) => client.on('error', ...))`, um ouvinte permanente por conexão | Dentro de `emTransacao`, derrubar o próprio backend com `pg_terminate_backend` pelo dono; a consulta rejeita e o pool continua respondendo | — |
| DES-03 | média | verificado | confirmado | `/registro-psicologo` segura conexão, lock e `FOR UPDATE` durante bcrypt e SMTP; um IP esgota o pool | `src/routes/auth-psicologo.ts:377` | Do BEGIN ao COMMIT a rota segura 1 das 10 conexões, inclusive no envio de e-mail (cerca de 10 s com a porta bloqueada). Limite de 10 por IP: 10 cadastros simultâneos congelam a API. Com o mesmo e-mail eles entram em fila no lock e o congelamento se multiplica | Seguir o desenho do `/auth/registro`: hash antes, transação curta, envio depois do COMMIT | 10 cadastros com envio segurado por 2 s; `SELECT 1` pelo pool responde em menos de 200 ms | abaixo da linha de corte |
| DES-05 | média | verificado | confirmado | Rate limit na memória: zera no deploy e, na banca, todos dividem o IP do hotspot | `src/lib/rota.ts:6` | Os limites contam também os acertos. Dois ensaios e a demo na mesma janela de 15 min podem levar o 11º login a um 429 (em texto puro). Sem `TRUST_PROXY`, o contador vale para todos os clientes juntos | `skipSuccessfulRequests: true` **só** em `/auth/login`. No login do psicólogo, cada acerto manda um e-mail de 2FA, então não aplicar lá. Conferir o `TRUST_PROXY` no A5 | 11 logins corretos seguidos: hoje o 11º dá 429; com a correção, 200 | A6 (só o 429 em JSON) |
| DES-06 | média | verificado | confirmado | O servidor espera o e-mail por mais tempo que o cliente | `src/lib/mailer.ts:14` | O nodemailer tem 10 s para conectar (com saudação e STARTTLS no mesmo prazo) e 15 s de inatividade por etapa. Um SMTP que trava depois do aperto de mão pode passar de 35 s. No login do psicólogo, a tentativa antiga, quando termina, invalida o desafio da nova, e o código certo falha | Somar no máximo cerca de 8 s de timeout de e-mail. No login do psicólogo, gravar o desafio antes de enviar | Envio segurado por 20 s: o login responde 502 em menos de 10 s | A4 |
| DES-04 | baixa | provável | provável | Idas e voltas em série: 6 no app, 13 no dashboard | `src/routes/psicologo/dashboard.ts:64` | Dentro de uma transação o pg manda uma consulta por vez. Com RTT de cerca de 150 ms (regiões diferentes, suposição), o dashboard leva cerca de 2 s. É lentidão, não falha | Conferir as regiões e alinhar as duas ao criar o banco da demo. Depois, juntar as consultas de sessão e papel | Contar as chamadas por requisição com `mock.method`: dashboard no máximo 6 | — |
| DES-07 | baixa | provável | não conferido | bcrypt no Render Free (0,1 CPU): cerca de 0,5 a 1 s por login; `hashSync` trava o boot | `src/lib/hashReferencia.ts:5` | As 4 threads da libuv e o event loop dividem 10% de um núcleo. Quatro logins simultâneos: o último espera cerca de 3 s. O `hashSync` soma cerca de 0,7 s a cada cold start | Trocar o `hashSync` por um hash pré-calculado escrito no código; manter custo 10; medir no Render | `HASH_REFERENCIA` começa com `$2b$10$`; medir p95 com 5 logins simultâneos | — |
| DES-08 | baixa | provável | não conferido | Listagem de auditoria lê e ordena a tabela inteira | `src/routes/psicologo/auditoria.ts:98` | O `OR` com `EXISTS` e o `ORDER BY` sobre uma expressão impedem o uso dos índices. Cada leitura do psicólogo grava uma linha, então a tabela cresce rápido. Na escala da banca custa poucos ms | Dois ramos com `UNION ALL`, cada um no seu índice | Com 50 mil linhas de outro psicólogo, o `EXPLAIN` não tem `Seq Scan` em auditoria | — |
| DES-09 | baixa | verificado | não conferido | `anotacao_clinica` sem índice e sem paginação | `src/routes/psicologo/pacientes.ts:430` | Cada leitura lê as notas de todos os psicólogos e devolve tudo de uma vez. Em 5 anos, um paciente semanal acumula cerca de 260 notas | Índice `(psicologo_id, paciente_id, criado_em DESC)` na próxima migration livre e paginação por cursor | `EXPLAIN` usa o índice; 31 anotações dão 30 mais um cursor | — |
| DES-10 | baixa | provável | não conferido | Filtros de data por expressão impedem o uso do índice | `src/routes/psicologo/dashboard.ts:145` | Converter a coluna para data antes de comparar faz o banco testar todas as consultas do psicólogo. Hoje são dezenas de linhas | Filtrar por intervalo na própria coluna, como `consultas.ts:91-92` já faz | Mesmo resultado nas bordas do dia em São Paulo; `EXPLAIN` com `Index Cond` | — |
| DES-11 | baixa | provável | não conferido | Resumo de 1 ano: cerca de 1.100 decifragens síncronas e até cerca de 0,8 MB de JSON | `src/routes/psicologo/pacientes.ts:194` | Com 365 dias, o event loop trava cerca de 15 a 25 ms num núcleo, e cerca de 0,2 s no Render Free | Comparação de período em SQL (1 linha em vez de 366); guardar a chave decodificada | Mesmos números antes e depois; atraso do event loop com p99 abaixo de 50 ms | — |
| DES-12 | baixa | verificado | não conferido | Sem encerramento gracioso; o envio em segundo plano manda o código antes de gravá-lo | `src/index.ts:12` | Um deploy entre o envio e a gravação deixa na caixa de entrada um código que nunca foi gravado | O handler de SIGTERM está no A4. Falta esperar os envios pendentes antes de fechar o pool | Encerramento com envio demorado: a linha do código existe antes de o pool fechar | A4 |

Já estavam no levantamento de 10/11 e continuam abertos:

- DES-01: `levantamento/checklists_desempenho_qualidade_ux.md` bloco A e `PLANO.md`.
- DES-03 e DES-06: `levantamento/server_arquitetura.md` e `server_dados.md`. A medida do esgotamento do pool é nova.
- DES-04, DES-07 e DES-11: `levantamento/checklists_desempenho_qualidade_ux.md` bloco A.
- DES-05: `levantamento/server_arquitetura.md`. Sobrepõe-se ao RACE-02 ([`server-corretude.md`](server-corretude.md)).
- DES-08 e DES-09: `levantamento/server_dados.md`.
- DES-10: `levantamento/checklists_desempenho_qualidade_ux.md`.
- DES-12: `levantamento/server_arquitetura.md`.

Correção de tempo feita pelos verificadores: o teto de "35 s" do e-mail não é uma soma simples. Porta bloqueada falha em cerca de 10 s; um servidor SMTP lento pode passar de 35 s.

## Refutados

Nenhum.

## O que não foi coberto

- Nada foi executado: nem `EXPLAIN (ANALYZE)`, nem autocannon, nem medição do event loop.
- Vêm da documentação dos fornecedores, não do repositório: regiões do Render e do Neon, CPU do Render Free, tempo de religar e cota de horas do Neon Free.
- Não foi conferido se o `keepAliveTimeout` padrão do Node (5 s) fica abaixo do keep-alive dos proxies do Vercel e do Render, o que causaria 502 esporádico.
- O A4 está fora deste commit. O timeout do Brevo é igual ao dos clientes, e o SIGTERM não espera os envios em segundo plano.
- O pool do PgBouncer do Neon Free e o `max_connections` não foram conferidos.
- Ficaram de fora: scripts, web, mobile, a memória do rate limit com muitos IPs e o crescimento das tabelas `sessao` e `desafio_2fa`, que nunca são limpas.
