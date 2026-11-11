# Mobile: arquitetura

> Levantamento em modo leitura, 10 e 11/11/2026. Agente `mobile_arquitetura`, Opus 5.5 (effort high). Nada foi executado além de leitura de código, `npm view/audit/outdated` e documentação pública; "verificado" quer dizer lido no código, não testado. Linhas citadas são do commit `0864143`.

## Resumo

Mapeei o app mobile (apps/mobile) lendo o código inteiro, sem alterar nada. O transporte da sessão é bem feito: token no SecureStore com WHEN_UNLOCKED_THIS_DEVICE_ONLY, espelho em memória e uma "versão de sessão" que descarta respostas atrasadas. Falta uma guarda de autenticação. A rota inicial é sempre Login e ninguém navega quando a sessão é restaurada ou expira, então o token salvo nunca faz o login automático e um 401 deixa o paciente preso no Main com telas de erro. Consequência grave: sem internet, quem abre o app de novo cai no Login e não chega ao SOS. Ainda no SOS, a ligação passa por Linking.canOpenURL('tel:...') e o manifesto não declara <queries> para tel. No Android 11+ isso deve fazer o CVV responder "não suporta chamadas" (provável, não testei em aparelho). O APK release de 29/10 foi gerado localmente com expo run:android, assinado com debug.keystore, e traz embutida uma URL de túnel efêmero *.trycloudflare.com. Dados vêm de useEffect/useFocusEffect manuais, sem cache. A tela Dados nunca recarrega depois de um check-in. O check-in mostra o selo de demonstração mesmo depois de salvar no servidor. O aceite de termos e de consentimento no cadastro existe só no cliente. O primeiro candidato a refatorar é checkin.tsx (795 linhas).

## Relatório

## Arquitetura do app mobile (apps/mobile)

Paths relativos a `apps/mobile/` quando não dito. Marcação: **[V]** = verificado (li o código ou o arquivo); **[S]** = suspeita ou inferência.

### 1. Navegação, guarda de autenticação e sessão
- **Árvore [V]:** `App.tsx` monta GestureHandlerRootView, depois ThemeProvider, depois `AppNavigator`.
  - **Stack nativo** (`src/navigation/AppNavigator.tsx:60-76`): Login, Registro, EsqueciSenha, VerificarCodigo, NovaSenha, Vinculacao, Main, Checkin, Dados, Consultas, ResponderEscala, Consentimento.
  - **Main** (`MainTabNavigator.tsx`) é um PagerView com 6 páginas memoizadas que montam na primeira visita: Home, Dados, Chat, Escalas, Bem Estar, SOS. A barra de abas é desenhada à mão (TouchableOpacity).
  - **Rotas mortas:** `BemEstar` é importado e tipado (`AppNavigator.tsx:12,27`), mas não está registrado. A rota de stack `Dados` (`:72`) nunca é navegada (só existe a aba).
- **Sem guarda de autenticação [V]:**
  - `initialRouteName="Login"` (`AppNavigator.tsx:61`) e nenhum código navega conforme `usuario`.
  - `useAuth` restaura a sessão (`useAuth.ts:76-112`) só para popular o perfil; o Login não pula para Main. Na prática o token persistido não serve para login automático.
  - Quando a sessão expira (`limparSessao`, `useAuth.ts:114-122`), os ouvintes são notificados, mas ninguém leva o usuário ao Login.
- **Onde fica o token [V]:** `lib/authToken.ts`.
  - SecureStore, chave `psychelink_token`, opção `WHEN_UNLOCKED_THIS_DEVICE_ONLY` (`:25-27`), com espelho em memória (`:11-13`).
  - No alvo web o token vai para `localStorage` (`:19-21`).
- **Versão de sessão [V]:** contador em módulo (`lib/api.ts:19-21`).
  - O interceptor de requisição grava a versão no config (`:34`).
  - Login, logout e expiração incrementam a versão antes de mexer no token. Respostas antigas são ignoradas (`useAuth.ts:69,95,157`).
- **Refresh:** não existe. O JWT dura 1 dia (`apps/server/src/routes/auth.ts:413`) **[V]**.
- **Logout [V]** (`useAuth.ts:384-398`): `POST /auth/logout`, depois `resetarRascunho()`, `limparContatos()` e `limparSessao()`.
- **Reação a 401/403 [V]** (`api.ts:46-66`):
  - 401 desloga sempre.
  - 403 desloga só se a mensagem contiver "sessão", "token" ou "acesso", e nunca quando `codigo === 'EMAIL_NAO_VERIFICADO'`. O servidor responde 403 "Token inválido ou expirado." (`server/src/routes/auth.ts:42`).
  - Inconsistência: o `useAuth` trata **qualquer** 403 como token inválido (`useAuth.ts:42-45`).

### 2. Camada de API [V]
- **Instância única:** `axios.create({ baseURL: API_URL, timeout: 15000 })` (`api.ts:12-15`).
- **baseURL:** usa `EXPO_PUBLIC_API_URL`; se não houver, usa `http://<hostUri do Metro>:3000`; no web ou sem hostUri, `http://localhost:3000` (`api.ts:6-10`). `.env.example` documenta só essa chave. Não existe `.env` em apps/mobile.
- **Interceptors:** um de requisição (Bearer) e um de resposta (expiração).
- **Retries:** só em `enviarRespostas` das escalas, uma vez e só sem resposta do servidor (`lib/escalasService.ts:37-45`). O check-in não tem retry nem idempotência.
- **Tratamento de erro repetido:**
  - `Alert.alert` aparece 20 vezes em useAuth, 17 em sos.tsx, 4 em consentimento.tsx, 3 em novaSenha.tsx, 3 em chat.tsx, 2 em responderEscala.tsx, 2 em checkin.tsx, 1 em GuidedExerciseModal.tsx e 1 em prototipo.ts.
  - O padrão `error.response?.data?.error || padrão` é repetido em useAuth, checkin e dados.
  - `mensagemDeErro` está duplicada de forma idêntica em `escalasService.ts:57` e `vinculoService.ts:59`.
- **Logs:** os `console.warn` só imprimem `error?.message` (`useAuth.ts:100,391`, `home.tsx:73,112`). `contatosConfianca.ts:34` evita de propósito imprimir dados. Não achei vazamento de dados sensíveis **[V]**.

### 3. Busca de dados e estado [V]
- **Sem biblioteca de estado ou cache.** O usuário fica num store em módulo, com `Set` de ouvintes (`useAuth.ts:22-40`); cada `useAuth()` assina e chama `restaurarSessaoSalva`. O tema usa Context, com `value` recriado a cada render (`ThemeContext.tsx:60`).
- **Home:** `useFocusEffect` com flag `telaAtiva` (`home.tsx:60-84`). Como as abas estão dentro do PagerView, o foco é do Main inteiro, não da aba.
- **useConsultas:** contador `ultima` contra resposta atrasada (`hooks/useConsultas.ts:10-21`).
- **Escalas:** recarrega quando `ativa` muda (`escalas.tsx:28-32`), sem proteção contra resposta atrasada.
- **Dados:** `useEffect` uma vez só (`dados.tsx:51-53`). Depois de um check-in os gráficos ficam velhos até o app reiniciar.
- **Consentimento e ResponderEscala:** `useEffect` simples, sem cancelamento.

### 4. Armazenamento local [V]
- **SecureStore:**
  - `psychelink_token`, com `WHEN_UNLOCKED_THIS_DEVICE_ONLY`.
  - `psychelink_contatos_confianca`, com a mesma opção e máximo de 10 contatos (`contatosConfianca.ts:6-14`).
  - `psychelink_hapticos` e `psychelink_theme_mode`, com as opções padrão.
- **AsyncStorage:** só a chave legada `@psychelink:contatos_confianca` (migrada e apagada) e o alvo web.
- **Rascunho do check-in:** variável de módulo, só em memória (`lib/rascunhoCheckin.ts:20`). Ele guarda o diário (`notas`).
  - O comentário diz que "sobrevive a background kill", mas memória de módulo morre junto com o processo.
  - O rascunho é limpo no logout, **não** na expiração da sessão.
- **Logout:** limpa token, contatos e rascunho. Tema e háptico continuam.
- **SOS offline:** os contatos são locais, a respiração não usa rede e o CVV é um `tel:`.
  - Como todo início a frio cai no Login (ver item 1), quem abre o app sem internet **não chega ao SOS**. A restauração ainda dispara o Alert "Não foi possível reconectar" (`useAuth.ts:102-108`).

### 5. Inventário de telas
| Tela | Fonte | Requisito | Estado |
|---|---|---|---|
| Login | `/auth/login` | F1 | completa, sem login automático |
| Registro + VerificarCodigo | `/auth/registro`, `/auth/verificar-email`; textos fixos em `constants/documentos.ts` | F1 | completa; aceite dos termos só no cliente |
| EsqueciSenha / NovaSenha | `/auth/esqueci-senha`, `/verificar-codigo-senha`, `/redefinir-senha` | F1 | completa |
| Vinculacao | `POST /paciente/vinculo` | F5 | completa; só acessível via Consentimento, apesar do passo "2" no cadastro |
| Home | `/checkin/painel`, `/paciente/consultas`, `/paciente/vinculo` | F6 | parcial: mostra números de exemplo com SeloDemonstracao quando não há dados (`home.tsx:31,96-150,232-239`) |
| Checkin (7 etapas) | `POST /checkin`, `/paciente/consentimento` | F2, F3, F8 | real, mas mostra SeloDemonstracao na tela de sucesso (`checkin.tsx:689`) |
| Dados | `/checkin/resumo` (gifted-charts) | F4, F6 | parcial; `null` vira 0 no gráfico (`dados.tsx:60,66`) |
| Escalas / ResponderEscala | `/paciente/escalas/pendentes`, `/paciente/aplicacoes/:id` | PHQ-9/GAD-7/DASS (F18/F19) | completa |
| Consentimento | `/paciente/consentimento`, `/paciente/vinculo/encerrar` | F5 | completa |
| Consultas | `/paciente/consultas` (SectionList) | agenda | completa |
| SOS | local: SecureStore e expo-contacts | F9 | parcial: só CVV, sem SAMU 192 nem Bombeiros 193 |
| Chat | mensagens fixas, `alertarDemonstracao`, SeloDemonstracao | F7 | protótipo (decisão: não implementar) |
| BemEstar | `constants/data.ts` (exercícios fixos); `moodHistory` só em estado | — | protótipo local, sem API |
| SheetConta | `/auth/me` via useAuth | — | 4 itens de menu sem ação: `acao` fica `undefined` porque a Home não passa os callbacks (`SheetConta.tsx:93-124`) |

Mock e protótipo: `lib/prototipo.ts` (usado só no chat), `components/ui/SeloDemonstracao.tsx` (home, checkin, chat), `constants/data.ts` (BemEstar), `EMOCOES_EXEMPLO` e os números fixos da Home, `mensagensIniciais` do chat. F10 não existe.

### 6. Confiança no cliente [V]
- **Termos e consentimento no cadastro:** os 4 aceites (`registro.tsx:28-35`) não são enviados. O servidor não registra aceite (`server/src/schemas.ts:27-36`; nenhum resultado para "termo/aceit"). Em LGPD art. 11 isso é um problema: não há prova de consentimento.
- **Alerta do item 9 do PHQ-9:** o paciente só vê o apoio pela regra local `sigla==='PHQ-9' && respostas[8]!==0` (`responderEscala.tsx:15,237`). O servidor calcula `item9_diferente_de_zero` por conta própria, então a regra está duplicada.
- **Divergências de validação com o servidor:** `diarioCompartilhado` exige texto (`checkinService.ts:22`); o slider de sono vai de 1 a 12 contra 0 a 24 no servidor (`checkin.tsx:436`, `schemas.ts:47`); `notas` não tem `maxLength` contra 2000 no servidor. A senha (mínimo 8) e o código (6 dígitos) estão duplicados, mas o servidor também valida.
- **Detecção de sessão pelo texto da mensagem** (item 1).

### 7. Desempenho
- **Listas [V]:** só Consultas usa SectionList; o resto usa `map` dentro de ScrollView, incluindo o chat. São listas pequenas, sem impacto hoje.
- **Animações [V]:**
  - O slider do check-in roda em worklets (GH 3 + Reanimated 4, `scheduleOnRN`).
  - O swipe de etapa mistura a API antiga `Gesture.Pan()` com `runOnJS`, e o gesto é recriado a cada render (`checkin.tsx:327-335`). **[S]** `runOnJS` está obsoleto no Reanimated 4.
  - `ExercicioRespiracao` e `BreathingCircle` usam o Animated do RN com `useNativeDriver`.
  - O parallax da Home usa `useAnimatedScrollHandler`.
- **Timers [V]:** intervals limpos em `ExercicioRespiracao`, `useGuidedExerciseTimer` e `verificarCodigo`. Os `setTimeout(…,200)` do BemEstar (`:55,78`) não têm limpeza (efeito baixo).
- **Context:** o `value` não memoizado do ThemeProvider re-renderiza todos os consumidores quando o tema muda (efeito baixo).
- **Gráficos [V]:** `LineChart` com `spacing` fixo de 44 e `adjustToWidth`, sem período nem limite de pontos. **[S]** Com séries longas pode ficar pesado.

### 8. Plataforma
- **app.json [V]:**
  - Pacote `com.anonymous.psychelink`, sem `scheme`.
  - Sem `newArchEnabled` explícito, mas `android/gradle.properties` tem `newArchEnabled=true`.
  - Sem React Compiler (nem `experiments.reactCompiler`).
  - Plugins: secure-store, status-bar, font. Sem plugin de permissões. `babel.config.js` só tem `babel-preset-expo`.
- **android/ [V]:** está no `.gitignore` da raiz, mas existe localmente.
  - O manifesto pede `READ_CONTACTS`, `WRITE_CONTACTS` e `SYSTEM_ALERT_WINDOW`; WRITE e SYSTEM_ALERT não são necessários.
  - `<queries>` só declara https, não `tel:`.
  - `usesCleartextTraffic` só no manifesto de debug.
  - `release` assina com `signingConfigs.debug` (`app/build.gradle:112-115`).
- **APK [V]:** `android/app/build/outputs/apk/release/app-release.apk` (97 MB, 29/10). Foi gerado localmente com `expo run:android` ou `gradlew assembleRelease`; não há `eas.json` nem `metro.config.js`. O bundle Hermes contém uma URL `https://…trycloudflare.com`, ou seja, `EXPO_PUBLIC_API_URL` apontando para um quick tunnel efêmero. **[S]** O APK deixa de funcionar quando o túnel cai. O processo de build não está documentado em lugar nenhum.

### 9. Separação de responsabilidades [V]
- **Arquivos mais longos:**
  - `checkin.tsx` (795 linhas): SliderControl com gestos, 7 renders de etapa, 11 estados, rascunho, envio e um tipo `RascunhoCheckin` local duplicado e desatualizado (`:23-34`, sem `diarioCompartilhado`).
  - `StyleBemEstar.ts` (712), `SheetConta.tsx` (690).
  - `sos.tsx` (593): parsing de contato com `any`, persistência, modal e UI.
  - `responderEscala.tsx` (565), `useAuth.ts` (413): store, validação de formulário, Alert e chamadas HTTP no mesmo hook.
- **`any`:** 23 ocorrências em `useAuth.ts`, `api.ts:21,34`, `sos.tsx:34,50,210,213-214`, `checkin.tsx:316,385,501,548`, `dados.tsx:41` e `verificarCodigo.tsx:64`.
- **Candidato número 1:** `checkin.tsx`. Sugestão: extrair `SliderControl`, um hook `useRascunhoCheckin` e um componente por etapa. Isso também ajuda na migração para NativeWind.

## Achados

| Severidade | Confiança | Achado | Onde | Detalhe |
|---|---|---|---|---|
| alta | verificado | Sem guarda de autenticação: rota inicial fixa em Login, sessão restaurada nunca é usada | apps/mobile/src/navigation/AppNavigator.tsx:61; src/hooks/useAuth.ts:76-143 | initialRouteName='Login' e nenhum código navega conforme usuario. O token no SecureStore só serve para GET /auth/me. Na expiração (limparSessao) os ouvintes são notificados, mas ninguém leva ao Login: o paciente fica no Main com erros. |
| alta | verificado | SOS inacessível offline num início a frio | AppNavigator.tsx:61; useAuth.ts:100-108 | Sem login automático, toda abertura do app cai no Login, que exige rede. O SOS (contatos locais, CVV) só é alcançável depois do login. Offline, o paciente vê o Alert 'Não foi possível reconectar' e não chega ao SOS. |
| alta | provavel | Ligação do SOS usa canOpenURL('tel:') sem <queries> para tel no manifesto | src/screens/paciente/sos/sos.tsx:113-125; android/app/src/main/AndroidManifest.xml (queries só https) | No Android 11+, canOpenURL depende de package visibility. Sem <queries> para tel, deve retornar false e mostrar 'Este dispositivo não suporta chamadas diretas' ao tocar no CVV. responderEscala e chat chamam openURL direto e não têm o problema. Não testei em aparelho. |
| alta | verificado | Aceite de Termos/Privacidade/Consentimento de dados sensíveis existe só no cliente | src/screens/auth/registro.tsx:28-35; src/hooks/useAuth.ts:272-277; apps/server/src/schemas.ts:27-36 | Os 4 aceites só habilitam o botão; nada vai para o servidor e não há tabela ou coluna de aceite. Não há prova de consentimento para LGPD art. 11. |
| media | verificado | APK release aponta para túnel trycloudflare efêmero e é assinado com debug.keystore | android/app/build/outputs/apk/release/app-release.apk; android/app/build.gradle:112-115 | O bundle Hermes contém https://…trycloudflare.com (EXPO_PUBLIC_API_URL no build). Quick tunnel muda de URL a cada execução, então o APK deve parar de funcionar quando o túnel cair (suspeita). Sem eas.json nem documentação do build. A pasta android/ está ignorada no git. |
| media | verificado | Logout por 403 decidido pelo texto da mensagem; useAuth trata qualquer 403 como token inválido | src/lib/api.ts:49-63; src/hooks/useAuth.ts:42-45 | O interceptor procura 'sessão', 'token' ou 'acesso' no texto do erro, o que é frágil se o servidor mudar a mensagem. O useAuth usa outra regra (todo 403). Seria melhor um código estruturado, ou 401 no servidor. |
| media | verificado | Selo 'Demonstração' na tela de sucesso de um check-in salvo de verdade | src/screens/paciente/checkin/checkin.tsx:688-690 | A etapa 7 só abre depois do POST /checkin bem-sucedido, mas mostra SeloDemonstracao. A mensagem fica contraditória na banca. |
| media | verificado | Rascunho do check-in (com diário) não é limpo na expiração de sessão | src/hooks/useAuth.ts:114-122; src/lib/rascunhoCheckin.ts | limparSessao não chama resetarRascunho; só o logout explícito chama. Outra conta logada no mesmo processo reabre o rascunho anterior, incluindo notas. O comentário 'sobrevive a background kill' também está errado: é memória de módulo. |
| media | verificado | Tela Dados não recarrega após check-in; null vira 0 no gráfico | src/screens/paciente/dashboard/dados.tsx:51-53,58-67 | Carrega uma vez no mount (a aba é memoizada no PagerView). Dias sem humor ou ansiedade são plotados como 0, o que distorce a tendência. |
| baixa | verificado | Itens de menu sem ação no SheetConta | src/components/ui/SheetConta.tsx:93-124; src/screens/paciente/dashboard/home.tsx:364-376 | Configurações da Conta, Notificações, Privacidade e Segurança e Ajuda e Suporte chamam acao?.() com undefined. Contraria a regra de prototipo.ts de 'nunca deixar CTA morto'. |
| baixa | verificado | Rotas mortas e tipo duplicado | AppNavigator.tsx:12,27,72; checkin.tsx:23-34 | BemEstar é importado e tipado mas não registrado; a rota de stack Dados nunca é navegada. checkin.tsx redeclara RascunhoCheckin sem diarioCompartilhado. |
| baixa | verificado | Validações divergentes do servidor (sono 1-12 contra 0-24, notas sem maxLength 2000) | checkin.tsx:92,436,611-625; apps/server/src/schemas.ts:47,50 | O paciente não consegue registrar 0 h nem mais de 12 h de sono; um texto acima de 2000 caracteres só falha no envio. |
| baixa | verificado | Permissões Android excessivas | android/app/src/main/AndroidManifest.xml | WRITE_CONTACTS e SYSTEM_ALERT_WINDOW não são usados pelo app (só lê um contato pelo picker). |
| baixa | provavel | Mistura de APIs de gesto (Gesture.Pan + runOnJS) com hooks novos (usePanGesture + scheduleOnRN) | checkin.tsx:116-136,327-335 | O gesto de swipe é recriado a cada render e usa runOnJS, que deve estar obsoleto no Reanimated 4.7. O slider já usa a API nova. |
| info | verificado | Tratamento de erro duplicado e 23 usos de any | escalasService.ts:57; vinculoService.ts:59; useAuth.ts; sos.tsx:34-50,210-214 | mensagemDeErro está duplicada de forma idêntica; o padrão error.response?.data?.error aparece em vários lugares; há muitos Alert.alert. O any concentra-se em useAuth (catch) e no parsing de contato do SOS. |

## Perguntas para o grupo

- Como o APK da demonstração é gerado e com qual EXPO_PUBLIC_API_URL? O APK atual aponta para um túnel trycloudflare efêmero e é assinado com debug.keystore.
- O paciente deve continuar logado ao reabrir o app (login automático com o token do SecureStore)? Hoje sempre cai no Login, o que bloqueia o SOS offline.
- O aceite de Termos e Consentimento no cadastro precisa ser registrado no servidor (versão do documento e data) para a banca e a LGPD?
- A Home deve continuar mostrando números de exemplo com selo quando o paciente não tem check-ins, ou só um estado vazio?
- O botão do CVV no SOS já foi testado num Android 11+ real com o APK release?
- BemEstar e o registro de humor pós-exercício vão para a API ou ficam como protótipo local?
