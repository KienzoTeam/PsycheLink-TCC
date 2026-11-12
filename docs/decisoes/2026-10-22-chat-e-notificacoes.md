# Council Meeting: chat próprio e notificações no PsycheLink

> Ata da reunião de 22/10/2026 que tirou o chat e o push remoto do escopo (copiada de `.claude/council/`, que não vai para o git). A "migration 0008" citada aqui não foi feita; o número 0008 é do lote A2 (hábitos). O bloqueio da tabela `mensagem` fica como item do BACKLOG.
**Data:** 2026-10-22
**Painel:** Strategist, Guardian, Advocate, Architect, Pathfinder (Opus, modo reunião, sequencial)

## Tópico
Vale construir um chat próprio (MongoDB + WebSocket, com texto, voz, chamadas e mídia) se psicólogos e pacientes já usam WhatsApp? E quais notificações fazer?

Restrições:
- o chat pode virar trabalho futuro;
- faltam menos de 1 mês para a entrega;
- a equipe testa só no Expo Go.

## Perspectivas iniciais
- **Strategist:** o chat completo é um item enorme com valor marginal, e o WhatsApp já resolve a conversa. O dia gasto nele sai da demo dos fluxos que só o PsycheLink tem.
- **Guardian:** a Res. CFP 09/2024 não exige plataforma, criptografia nem log de chat. Ela obriga o psicólogo a avaliar o sigilo do canal e declará-lo no contrato (Art. 7º). Cortar o chat é minimizar dados, não deixar uma lacuna.
- **Advocate:** entre sessões, o paciente precisa de lembrete, de saber que há escala pedida e de ver a agenda, não de outra conversa. Chat traz a mensagem de crise às 23h que ninguém lê.
- **Architect:** MongoDB está descartado: seria um segundo banco fora da RLS, da cifra e da auditoria. Se algo for feito, REST com polling sobre a tabela `mensagem`. Notificação é uma leitura derivada mais agendamento local.
- **Pathfinder:** no Expo Go cabem notificações locais (`DAILY`, `DATE`) e avisos dentro do app. Push remoto e WebRTC exigem development build. Habilitar push leva de 1 a 3 dias, e só no Android.

## Destaques do confronto
1. **Advocate e Strategist:** "que tarefa do paciente o chat resolve que um 'pedir remarcação' não resolva?". O Strategist mudou de posição: chat de mão dupla vira trabalho futuro.
2. **Architect e Advocate:** um recado com texto livre é, na estrutura, o mesmo chat. O Advocate retirou essa variante e ficou só com o pedido estruturado, com motivo escolhido numa lista curta.
3. **Advocate e Guardian:** uma mensagem de crise gravada e não lida vira o registro de que "a plataforma recebeu e ninguém agiu". Aviso fixo e SOS são necessários, mas não suficientes.
4. **Strategist e Architect:** o "pedir remarcação" custa S (1 a 1,5 dia), mas não pode ficar em `consulta.status`. A regra que impede consultas sobrepostas só vale para `'agendada'`, então trocar o status liberaria o horário do psicólogo. A solução são colunas novas e uma função `SECURITY DEFINER`.
5. **Guardian e Pathfinder:** notificações locais também aparecem na tela de bloqueio. A decisão foi texto sempre genérico, com uma frase neutra por tipo, e o detalhe só aparece ao tocar.

## Insights principais
- **Strategist:** o corte valioso foi tirar o texto livre, não as funcionalidades. Cortar o chat custa horas, não dias.
- **Guardian:** o risco está no texto livre. A maior lacuna de retenção nem é o chat: é a exclusão em cascata quando uma conta é apagada.
- **Advocate:** o "pedir remarcação" estruturado atende a paciente sem abrir espaço para um "não aguento mais".
- **Architect:** neste prazo, notificação não pede infraestrutura nova, só leituras derivadas e agendamentos locais.
- **Pathfinder:** sem push, a notificação local vira a porta de entrada diária do app.

## Consenso
- **Fora agora** (vira trabalho futuro com justificativa): chat de mão dupla, MongoDB, WebSocket, mensagem de voz, imagem e vídeo, chamadas, push remoto e EAS/FCM.
- **Must:**
  - lembrete local `checkin-diario` com texto neutro ("PsycheLink: hora do seu registro de hoje"); o toque abre o check-in;
  - pendências derivadas na tela inicial do app e no painel web: escala solicitada ou respondida, próxima consulta;
  - migration 0008: bloquear `mensagem` (`REVOKE ALL` + RLS sem policy) e trocar `fk_mensagem_remetente` para `RESTRICT`;
  - documentação: corrigir F8/FP7 (o log é requisito do projeto, não da Res. CFP 09/2024), ADR do corte e parágrafo no termo dizendo que o PsycheLink não é canal de conversa nem de emergência, com o SOS sempre visível.
- **Should:** lembretes `consulta-<id>` reconciliados a cada volta ao primeiro plano.
  - Cancela por id e nunca usa `cancelAllScheduledNotificationsAsync`.
  - Texto genérico ("PsycheLink: você tem um lembrete hoje"); o toque abre a agenda.
- **Could:** "pedir remarcação" estruturado, só com motivo de lista, se os Musts estiverem estáveis até o dia 10.
- **Detalhes de mobile:**
  - instalar `expo-notifications` com `npx expo install`;
  - canal Android `PRIVATE`, criado antes de pedir permissão;
  - pedir a permissão depois do primeiro check-in;
  - validar num Android real com Expo Go na semana 1.

## Tensões não resolvidas
1. **Exclusão de conta e guarda de 5 anos:** o `ON DELETE CASCADE` a partir de `paciente`/`users` apaga anotações, check-ins, escalas e consultas. A LGPD (Art. 18, VI) dá direito de eliminação, e o Art. 16, I permite guardar dados por obrigação legal. Falta definir a política.
2. **Sem push:** escala pedida, remarcação ou cancelamento só chegam ao paciente quando ele abre o app, e o lembrete local pode tocar no horário antigo. Ou se aceita isso, ou se gastam de 1 a 3 dias em EAS e FCM.
3. **Tempo:** o "pedir remarcação" (1 a 1,5 dia) disputa tempo com estabilizar e ensaiar a demo.

## Perguntas para vocês
- O orientador aceita reescrever F8/FP7 e o item "novas mensagens" de FP12 como decisão de escopo justificada?
- Qual é a data exata da entrega? Serve para fixar o congelamento de escopo, uns 7 dias antes.
- Os psicólogos ouvidos, ou o orientador, querem receber pedidos do paciente dentro do PsycheLink, ou preferem tudo no WhatsApp?
- Na exclusão de conta: guardar por 5 anos (bloqueado, só para o psicólogo responsável) ou apagar tudo e declarar como limitação do protótipo?
- Em que aparelho será a demo (Android ou iPhone, físico)?
- A equipe aceita defender que, sem push, o paciente só descobre as novidades ao abrir o app?
- Na demo, o celular fala com um servidor publicado (qual hospedagem?) ou com o notebook na mesma rede Wi-Fi?

## Próximos passos recomendados
1. Levar as perguntas acima ao orientador esta semana: escopo de F8/FP7, retenção e hospedagem da demo.
2. **Semana 1:**
   - lembrete local de check-in;
   - pendências derivadas na web e no app;
   - migration 0008 com o bloqueio de `mensagem`;
   - teste num Android real.
3. **Semana 2:**
   - lembretes de consulta reconciliados;
   - textos da monografia, ADR e termo de consentimento.
4. **Por último, se houver folga:** "pedir remarcação" estruturado.
5. **A partir de ~7 dias antes da banca:** só correções e ensaio.

Arquivos da discussão: `deliberation/round1/`, `deliberation/round2/` e `deliberation/round3/`.
