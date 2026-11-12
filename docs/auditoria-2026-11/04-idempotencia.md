# Idempotência no server

Leitura estática do commit `a630eae`. Nada foi executado. Os caminhos são relativos a `apps/server`, salvo os que começam com `web/` ou `mobile/`. Os ids apontam para [`setores/server-corretude.md`](setores/server-corretude.md).

## Termos usados

- **Idempotência**: repetir o mesmo pedido deixa o sistema como se ele tivesse sido feito uma vez só, e a resposta continua dizendo que deu certo.
- **Chave de idempotência**: um identificador que o cliente gera uma vez por ação e manda junto. Se o servidor já viu a chave, devolve o resultado anterior em vez de gravar de novo.
- **Reenvio**: o cliente manda o mesmo pedido de novo, porque não recebeu resposta (timeout) ou porque a pessoa tocou duas vezes.
- **Timeout**: o tempo máximo que o cliente espera antes de desistir.

## Webhook e gateway de pagamento

**Não se aplica: o projeto não tem nenhum dos dois.** Um grep por webhook, stripe, pagamento, payment e idempot em `apps/*/src` e nos `package.json` não acha nada. Nenhuma rota aceita chave de idempotência.

## Por que isso importa mesmo assim

Os dois clientes usam axios com timeout de 15 s (`mobile/src/lib/api.ts:14`, `web/src/lib/api.ts:12`). Nenhum repete escritas sozinho: o web só repete leituras que falharam com erro 5xx ou de rede (`web/src/lib/queryClient.ts:5-9`).

O problema é outro. Quando o cliente desiste, o servidor não cancela nada, e a gravação termina depois do timeout. Isso acontece em três situações:

- quando o servidor está lento para acordar;
- quando o envio de e-mail demora;
- quando a resposta se perde na rede.

A pessoa vê uma mensagem de erro e toca de novo. O reenvio é sempre manual.

Sobre o e-mail: no nodemailer 10.2.1, conexão, saudação e STARTTLS dividem um prazo de 10 s, e os 15 s do socket contam inatividade por etapa. Uma porta bloqueada falha em cerca de 10 s, antes dos 15 s do cliente. Só um servidor SMTP lento, que aceita a conexão e depois demora, passa dos 15 s. Os achados que dependem disso (IDEM-05, IDEM-06) ficam como prováveis.

## Tabela

| Escrita | Duplo toque (ao mesmo tempo) | Reenvio com a escrita já feita | Efeito | Ref. |
|---|---|---|---|---|
| POST /auth/registro (`auth.ts:144-217`) | serializado pelo lock | 201; regrava o código e manda um 2º e-mail | 2 e-mails; o código do 1º dá "Código incorreto" | IDEM-05 |
| POST /auth/registro-psicologo (`auth-psicologo.ts:294-411`) | idem; o 2º espera o lock preso ao envio do 1º | idem | idem | IDEM-05 |
| POST /auth/verificar-email (`auth.ts:221-256`) | as duas 200 | 400 "Código inválido ou expirado" (a linha foi apagada) | erro depois do sucesso | IDEM-07 (A6) |
| POST /auth/reenviar-codigo, /auth/esqueci-senha | 2 e-mails (intervalo não atômico) | resposta fixa | seguro na resposta | conhecido |
| POST /auth/verificar-codigo-senha (`auth.ts:302-336`) | 2 tokens | 400 (a linha foi apagada) | precisa pedir outro código | IDEM-07 (A6) |
| POST /auth/redefinir-senha (`auth.ts:339-381`) | as duas trocam a senha | o token vale 10 min: troca de novo | efeito igual | conhecido (K-04) |
| POST /auth/login, /auth/logout | sem escrita ou UPDATE idempotente | igual | seguro | — |
| POST /auth/psicologo/login (`auth-psicologo.ts:47-122`) | 2 e-mails, até 2 desafios vivos | com e-mail lento, o pedido antigo termina depois e invalida o desafio do novo | "Código inválido ou expirado" e um terceiro login | IDEM-06 |
| POST /auth/psicologo/2fa | uma sessão | 400 (desafio usado), e o cookie da 1ª se perdeu | novo login; aceitável | — |
| POST /auth/psicologo/2fa/reenviar | um e-mail | 429 com o tempo de espera | seguro | — |
| POST /auth/psicologo/refresh (`:221-281`) | 200 e 409 | sem o cookie novo: 409 por 10 s, depois revogação e auditoria de reuso | logout e alarme falso | IDEM-03 |
| POST /auth/psicologo/logout | idempotente | igual | seguro | — |
| POST /checkin (`checkin.ts:163-221`) | 201 e 409 | 409 "Você já registrou um check-in hoje."; o app mostra "Não foi possível salvar" e mantém o rascunho | erro depois do sucesso | IDEM-01 |
| PUT /paciente/consentimento | upsert; auditoria em dobro só na 1ª vez | mesmo estado; só audita o que mudou | seguro | conhecido |
| POST /paciente/consentimento/diario/parar | a 2ª revoga 0 | igual | seguro | — |
| POST /paciente/vinculo (`paciente/vinculo.ts:40-114`) | 201 e 400 "Código inválido ou expirado."; a tela atual quase não dispara isso (o botão fica desabilitado e o 201 já navega) | 409 "Você já tem um psicólogo vinculado."; a mensagem diz a verdade e o paciente segue pela Home | erro depois do sucesso, no fluxo da demo | IDEM-02 |
| POST /paciente/vinculo/encerrar | 200 e 404 | 404 "Você não tem vínculo ativo." | erro depois do sucesso | IDEM-09 |
| GET /paciente/aplicacoes/:id (marca "em andamento") | idempotente | igual | seguro | — |
| POST /paciente/aplicacoes/:id/respostas (`paciente/escalas.ts:77-149`) | mesmo sucesso | mesmo sucesso, comparando as respostas (`:99-107`) | **idempotente: é o modelo a copiar** | — |
| POST /psicologo/vinculo/codigos | 2 códigos | 2º código; o 1º fica ativo sem nunca ter sido mostrado e ocupa 1 das 10 vagas | duplica | IDEM-09 |
| DELETE /psicologo/vinculo/codigos/:id | 200 e 404 | 404 | erro depois do sucesso | IDEM-09 |
| POST /psicologo/pacientes/:id/escalas | 201 e 409 | 409 "Já existe uma aplicação desta escala em aberto" | efeito único, mensagem enganosa | IDEM-09 |
| POST /psicologo/aplicacoes/:id/cancelar | 200 e 404 | 404 | erro depois do sucesso | IDEM-09 |
| POST /psicologo/consultas | 201 e 409 | 409 `CONFLITO_AGENDA` contra a própria consulta; se o psicólogo repetir em outro horário, duplica | efeito único no mesmo horário | IDEM-09 |
| PATCH /psicologo/consultas/:id | status: 404 na 2ª; observação: vale a última | igual | erro depois do sucesso no status | IDEM-09 |
| POST /psicologo/consultas/:id/remarcar | 201 e 404 | 404 | erro depois do sucesso | IDEM-09 |
| POST /psicologo/pacientes/:id/encerrar-vinculo | 200 e 404 | 404 "Paciente não encontrado." | erro depois do sucesso | IDEM-09 |
| POST /psicologo/pacientes/:id/anotacoes (`pacientes.ts:453-489`) | 2 anotações; o botão da tela atual quase não dispara isso | 2 anotações; não há rota para apagar e a guarda é de 5 anos | **duplica no prontuário** | IDEM-04 |
| POST /psicologo/relatorios/exportacoes | 2 números | 2 registros na auditoria | duplica a auditoria | conhecido |
| PATCH /psicologo/me | vale a última | igual | seguro | — |
| POST /psicologo/me/senha (`conta.ts:55-84`) | vale a última | 400 "Senha atual incorreta." com a senha já trocada | erro depois do sucesso | IDEM-08 |
| POST /psicologo/me/sessoes/encerrar-outras | a 2ª encerra 0 | igual | seguro | — |

Correções feitas pelos verificadores:

- **IDEM-02:** no servidor, duas requisições iguais dão 201 e 400. Na tela atual isso quase não acontece, porque o botão de vincular fica desabilitado enquanto envia e o 201 já troca de tela. Um cliente feito com `curl` dispara do mesmo jeito.
- **IDEM-03:** o gatilho "Render acordando" foi refutado. O refresh só sai depois de um 401, e nessa hora o servidor já está acordado. Sobra rede instável.
- **IDEM-04:** no timeout, a tela mostra "Não foi possível falar com o servidor. Tente de novo em instantes." (`web/src/lib/erros.ts:6`), e esse texto convida a reenviar.

## Padrões para corrigir

1. **Quando há chave natural**, a repetição com o mesmo pedido devolve o recurso existente com 200. Exemplos: o check-in do dia, o vínculo pelo código usado, a consulta no mesmo horário. O modelo já existe em `paciente/escalas.ts:99-107`.
2. **Criações sem chave natural** (anotação, código de vínculo, exportação) usam uma chave gerada pelo cliente uma vez por formulário. No banco: `UNIQUE (psicologo_id, chave)` e `ON CONFLICT DO NOTHING RETURNING`.
3. **Envio de e-mail:** a requisição mais nova grava antes de enviar, e o intervalo de 60 s vale também para o cadastro.
4. **No web**, depois de erro de rede ou timeout numa escrita, recarregar a lista antes de deixar repetir, para o estado real aparecer.

Cuidado com o IDEM-07. Manter a linha do código depois do uso, para o reenvio dar 200, aumenta a janela de reuso do código. Prefira a saída pelo app: "Já confirmou? Entrar".

## Prioridade

As três que a banca pode ver na demonstração:

- IDEM-01 (check-in), média;
- IDEM-04 (anotação duplicada), média;
- IDEM-02 (vinculação), baixa.

As outras são baixas e dependem de rede ruim ou de e-mail lento.
