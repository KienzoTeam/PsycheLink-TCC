# Roteiro: conferir o NativeWind no Expo Go (13/11)

Você só precisa do Expo Go no celular Android, da mesma rede Wi-Fi do computador, e de uns 30 minutos. A branch é descartável (`spike/nativewind`): o que se quer saber é se a tela convertida fica igual à original e se nada do resto quebrou.

## 1. Subir tudo (um Metro por vez)

Só pode haver um Metro rodando por vez (os dois checkouts usam a porta 8081). Feche o outro antes de abrir este.

1. Servidor de teste, em um terminal:
   ```
   cd apps/server && npm run dev:test
   ```
   Se a conta de demonstração não existir no banco de teste: `npm run seed:dev` na mesma pasta.
2. App com NativeWind, em outro terminal:
   ```
   cd <worktree spike-nativewind>/apps/mobile && npx expo start --clear
   ```
   (`node_modules` já está instalado nesse worktree. Se aparecer "port 8081 is running", feche o outro Metro ou use `--port 8082`.)
3. Abra o Expo Go e escaneie o QR code. O app descobre o servidor sozinho (mesmo IP do Metro, porta 3000). Se o login não conectar, pare o Metro e suba com o IP do computador:
   `EXPO_PUBLIC_API_URL=http://<IP-DO-PC>:3000 npx expo start --clear`
4. Entre com `demo.paciente1@psychelink.test` / `Demo!2026psy` (Ana Souza).

Se aparecer tela vermelha de erro, tire foto/print e copie o texto do erro: isso já é um resultado (critério falhou) e diz o que consertar.

## 2. Como chegar nas telas

- **Consultas (a tela convertida):** aba Início, card "Próxima consulta", que abre "Minhas consultas".
- **Trocar o tema:** aba Início, avatar com a engrenagem no canto superior direito, folha da conta, seção "Aparência" (Sistema, Claro, Escuro).
- **Check-in:** aba Início, card roxo "Como você está hoje?".
- **SOS:** aba SOS. **Consentimento:** avatar, "Psicólogo e privacidade".
- O seed não cria consultas. Sem dados você vê o estado vazio ("Nenhuma consulta por aqui ainda..."). Para ver os cartões (data, horário, psicólogo, ícone de status, seções "Próximas" e "Anteriores"), marque 2 ou 3 consultas para a Ana Souza como psicóloga (`demo.psicologa@psychelink.test`) pelo painel web, incluindo uma cancelada e uma concluída. Não conferi o passo a passo no painel; peça ajuda a quem conhece a agenda se travar. Os estados de erro (desligue o servidor e puxe para atualizar) e de carregamento também servem de comparação.

## 3. Como comparar com o original

Compare sempre a mesma tela, com os mesmos dados, no mesmo tema, uma depois da outra (de preferência com print de cada lado).

1. Feche o Metro do spike (Ctrl+C).
2. Abra o checkout principal:
   ```
   cd apps/mobile && npx expo start --clear
   ```
3. Abra o Expo Go de novo, entre e vá em Minhas consultas.
4. Alterne entre os dois (um Metro por vez) e compare.

## 4. Lista de marcar (critérios 4 a 7)

Marque cada item e anote "igual" ou o que mudou.

- [ ] **4. A tela de consultas abre e fica igual à original.**
  O que olhar: espaçamentos (cabeçalho, entre cartões, margem das bordas), tamanho e peso das letras (título "Minhas consultas", datas em negrito, horário e "com ..." menores), borda e cantos arredondados dos cartões, ícone de status (cor e tamanho), botão voltar, estado vazio centralizado, rolagem e "puxar para atualizar".
- [ ] **5. Trocar o tema muda as cores da tela convertida.**
  O que olhar, nesta ordem: abra Minhas consultas em Claro; volte, troque para Escuro na folha da conta e volte à tela: fundo, cartões, bordas e textos devem trocar na hora e ficar iguais ao original no escuro; troque para Sistema e mude o tema do celular (puxe o painel rápido e ative/desative o modo escuro): a tela deve acompanhar. Feche e reabra o app em Escuro: ele deve voltar escuro.
- [ ] **6. O slider do check-in continua animando ao arrastar.**
  O que olhar: abra o check-in, arraste o slider devagar e rápido; a bolinha segue o dedo, a cor/valor muda, sem travar nem pular, igual ao original. Abra e feche a folha da conta e o exercício de respiração (usam as mesmas bibliotecas de animação e de folha).
- [ ] **7. Três telas não convertidas continuam iguais.**
  O que olhar: Início (cabeçalho com gradiente, cards, gráfico em "Dados"), SOS e Consentimento, em Claro e em Escuro. Procure texto cortado, fonte diferente, espaçamento mudado, cor errada ou lentidão ao rolar.

## 5. O que me devolver

Um "passou/falhou" por critério, os prints lado a lado de qualquer diferença e o texto de qualquer erro vermelho. Se os critérios 6 ou 7 falharem, avise: existe uma configuração alternativa (`globalClassNamePolyfill: false` no `metro.config.js`) que isola o NativeWind só nas telas convertidas, mas ela não foi testada.
