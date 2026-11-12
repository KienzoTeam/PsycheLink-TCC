# Relatório da revisão de novembro

Revisão multiagente, feita em 12/11/2026. Cada setor leu o código e propôs achados. Um verificador releu cada achado no código, e um setor crítico cruzou os setores entre si.

O plano está em [`PLANO.md`](PLANO.md), o estado em [`ESTADO.md`](ESTADO.md) e o levantamento de 10/11 em [`levantamento/INDICE.md`](levantamento/INDICE.md).

Documentos do pedido:

| Documento | Assunto |
|---|---|
| [`01-testes.md`](01-testes.md) | ferramenta, banco de teste, CI, contagem e cobertura dos fluxos críticos |
| [`02-confianca-no-cliente.md`](02-confianca-no-cliente.md) | o que o servidor confere sozinho: matriz de autorização e RLS |
| [`03-race-conditions.md`](03-race-conditions.md) | duas requisições ao mesmo tempo |
| [`04-idempotencia.md`](04-idempotencia.md) | o mesmo pedido repetido |
| [`05-separacao.md`](05-separacao.md) | tamanho, mistura de camadas, duplicação e o que refatorar |

## Server

Leitura estática do commit `a630eae` (main mais os lotes A1 e A2). Nada foi executado nesta revisão. A suíte foi medida à parte, em 12/11: 242 testes, 242 passam.

Detalhe por setor:

- [`setores/server-seguranca.md`](setores/server-seguranca.md)
- [`setores/server-corretude.md`](setores/server-corretude.md)
- [`setores/server-desempenho.md`](setores/server-desempenho.md)
- [`setores/server-complexidade.md`](setores/server-complexidade.md)
- [`setores/server-conformidade.md`](setores/server-conformidade.md)
- [`setores/server-critico.md`](setores/server-critico.md)

**Nenhum achado chegou a crítico.** Crítico, nesta revisão, quer dizer vazamento de dado sensível, acesso indevido ou perda de dado sem pré-condição. O mais perto disso é o A7, que já está na fila.

### O que está bom

- **Autorização.** Todo id da URL ou do corpo fica amarrado ao dono no próprio SQL, e o id de outra pessoa responde 404, igual a um id inexistente. Não há BOLA (ler o objeto de outro trocando o id), BFLA (usar função de outro papel) nem mass assignment (gravar campo que o cliente mandou a mais).
- **Duas barreiras.** Toda rota do psicólogo confere o vínculo ativo e o consentimento. A RLS do PostgreSQL repete a conferência do vínculo com um papel de banco que não pode ignorá-la. Sem contexto, nenhuma linha passa.
- **Sessão web.** 2FA por e-mail, cookies `HttpOnly`, `Secure` e `SameSite=Strict`, rotação do refresh com detecção de reuso, 12 h no total e 30 min sem uso, e checagem de Origin contra CSRF.
- **Concorrência.** Os locks e as constraints ficam no banco, então valem com mais de uma instância. Escalas e consultas são exemplos bons: a resposta de escala é idempotente e serve de modelo.
- **Cálculos.** A pontuação das escalas, as subescalas da DASS-21, o item 9 e a correlação conferem, e há teste.
- **Dados sensíveis.** Os textos livres são cifrados por campo com AES-256-GCM. A auditoria é imutável para o papel da aplicação.
- **Testes.** São 242 testes. A grande maioria é de integração e bate nas rotas reais; o resto é unitário ou SQL direto no banco. Rodam num banco separado, protegido por uma trava, e o CI roda em todo PR.

### Os 10 achados mais graves

Ordem: severidade final, depois achado confirmado pelo verificador. Achados que falam da mesma coisa foram juntados.

| # | Id | Sev. | Veredito | O que acontece | Lote |
|---|---|---|---|---|---|
| 1 | A7-ref + QUAL-03 | alta | confirmado | O psicólogo de um vínculo novo lê o histórico e os diários que o paciente liberou ao anterior. São 13 consultas em 3 formatos para corrigir | A7 |
| 2 | FUSO-01 + QUAL-02 | alta | confirmado / provável | Um check-in depois das 21h cai no dia seguinte, some do Perfil e do Relatório e bloqueia o check-in da manhã. O A3 precisa incluir `dashboard.ts`, `pacientes.ts` e `lib/resumo.ts` | A3 |
| 3 | LGPD-02 | alta | confirmado | Os textos legais do app mandam a menus e e-mails que não existem e prometem chat, TLS 1.3 e uma "Ltda.". É o primeiro texto que a banca lê | — (só texto) |
| 4 | A11-ref | alta | confirmado | O aceite dos termos existe só na tela; o servidor não guarda prova | A11 |
| 5 | DES-01 | alta | provável | O servidor gratuito dorme e leva até cerca de 1 min para acordar; os clientes desistem em 15 s. A primeira tela da banca pode dar erro | A4/A5 |
| 6 | SEG-01 | média | confirmado | A confirmação do cadastro não confere a senha. Quem pré-cadastra o e-mail de outra pessoa fica com a conta e pode ligá-la a um psicólogo dele | — (junto do A11) |
| 7 | CAD-01 | média | confirmado | Um cadastro pendente de psicólogo bloqueia para sempre o mesmo e-mail como paciente. O A6 torna isso permanente | — (junto do A6) |
| 8 | SEG-02 + SEG-03 | média | confirmado | "Código incorreto." e o 409 do cadastro de psicólogo revelam se o e-mail tem conta. Num app de saúde mental isso já é dado sensível | — (SEG-02 no PR do A6) |
| 9 | DES-02 | média | confirmado | Uma queda de conexão com o banco no meio de uma transação derruba o processo inteiro. A correção é uma linha em `db.ts` | — |
| 10 | DES-03 + DES-06 | média | confirmado | O cadastro de psicólogo segura uma conexão do pool durante o envio de e-mail. Um único IP, dentro do limite, congela a API | DES-06 no A4; DES-03 abaixo da linha de corte |

Outros achados de severidade média, fora dos 10:

- **Conformidade:** LGPD-01 (o paciente não relê os próprios dados), LGPD-05 ("Humor" libera contextos e horário sem dizer), LGPD-08 (data de nascimento sem uso e sem checagem de idade), LGPD-03 (exclusão manual apaga dados da outra parte).
- **Corretude:** IDEM-01 (check-in reenviado parece falha), IDEM-04 (anotação duplicada), RACE-01 (tentativas do código, A6), RACE-02 com DES-05 (rate limit só em memória; na banca todos dividem o IP do hotspot).
- **Já conhecido no levantamento:** CFP-01.

### Ordem sugerida de correção

A ordem respeita a fila do plano e as "correções que se anulam" do setor crítico.

1. **Merge do que está pronto:** #34 (A1), #35 (A2) e #37 (A4/A5). O A4 traz o `/health`, e o A5 o ping (DES-01). Ligar o ping só nos ensaios e no dia.
2. **Um PR pequeno, sem mudar contrato:**
   - DES-02 (ouvinte de erro por conexão em `db.ts`);
   - K-02 (`no-store` em `/checkin`).

   O SEG-03 também é pequeno, mas muda o contrato: o formulário do web deixa de receber 409 e passa a receber 201 com aviso. Vai num PR próprio, com a tela do web ajustada, sem mexer na transação.
3. **Textos do app**, sem código: LGPD-02, LGPD-05 e as frases de `consentimento.tsx`. A tabela linha a linha está em [`setores/server-conformidade.md`](setores/server-conformidade.md).
4. **A3**, com a lista de arquivos ampliada (FUSO-01 e QUAL-02). Usar uma expressão só para o dia de São Paulo, sem trocar o TimeZone da sessão. Junto, o teste de caracterização do painel (QUAL-01).
5. **A6**, junto com:
   - CAD-01, antes ou no mesmo PR, porque recusar psicólogo no `/auth/login` sem ele torna o bloqueio permanente;
   - SEG-02, porque o A6 já reescreve `conferirCodigo`;
   - OTP-02, RACE-01, RACE-05 e QUAL-04;
   - `skipSuccessfulRequests` **só em `/auth/login`**: no login do psicólogo, cada acerto manda um e-mail de 2FA (DES-05 contra OTP-01).
6. **A7**, com o predicado único "check-in visível ao psicólogo" (QUAL-03): primeiro a refatoração sem mudar comportamento, depois a regra com teste vermelho.
7. **A11**, junto com SEG-01 (senha no `/verificar-email`, que muda o contrato do app e do web) e LGPD-10 (termo do psicólogo).
8. **Se sobrar tempo:** IDEM-01 e IDEM-04 (repetição devolve sucesso); as policies largas (RLS-01 a RLS-03, migration a partir da `0009`, número a combinar).
9. **Abaixo da linha de corte:** DES-03 (tirar o e-mail da transação), FUSO-02, os índices (DES-08, DES-09), o resto dos baixos.

Para não fazer: aceitar o refresh anterior por 60 s (IDEM-03) sem decidir conscientemente a troca, e manter a linha do código depois do uso (IDEM-07).

Frases da apresentação: algumas promessas precisam de ajuste antes da banca. Por exemplo, "toda leitura é auditada" e "o banco confere o consentimento". As frases que dá para afirmar estão em [`setores/server-conformidade.md`](setores/server-conformidade.md).

### O que fica para web e mobile

A revisão multiagente do web e do mobile ainda não foi feita. Os documentos 02 e 05 têm a seção "Web e mobile: pendente". Do lado do server, já se sabe o que eles precisam olhar:

- **Mobile:**
  - o alerta do check-in reenviado (IDEM-01);
  - os textos de consentimento e de `documentos.ts` (LGPD-02, LGPD-05);
  - o aceite feito só na tela (A11);
  - onde o token fica guardado e o cache HTTP do aparelho (K-02);
  - o rascunho do check-in depois do "parar diário" (DIA-01);
  - a tela de leitura dos próprios dados, se entrar (LGPD-01).
- **Web:**
  - o seletor de período no fuso do navegador (FUSO-01);
  - a recarga da lista depois de timeout numa escrita (IDEM-04, IDEM-09);
  - a resposta 409 do refresh tratada como sucesso (IDEM-03);
  - o cadastro do psicólogo sem termo (LGPD-10);
  - o texto "Cada acesso deixa rastro" de `PRODUCT.md` (LGPD-06);
  - CSP e variáveis `VITE_*`.
- **Os dois:** não há nenhum teste nem ferramenta de teste no web e no mobile (`levantamento/server_testes.md`).
