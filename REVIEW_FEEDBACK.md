# Code Review - PsycheLink Mobile Frontend

Este documento apresenta uma análise técnica do frontend mobile do projeto PsycheLink, destacando pontos positivos, áreas de melhoria e sugestões arquiteturais.

## 1. Análise Geral
O projeto utiliza **React Native com Expo** e está bem estruturado em termos de navegação e estilização. O uso de **TypeScript** é um ponto forte, garantindo maior segurança no desenvolvimento.

## 2. Pontos Positivos
- **Identidade Visual**: Uso consistente de gradientes e uma paleta de cores moderna (baseada no Catppuccin/Nord).
- **Tipagem**: Definição clara do `RootStackParamList` facilitando a navegação segura.
- **Componentização Inicial**: Presença de componentes reutilizáveis como `CustomInput`, `AppLogo` e `BottomNavBar`.

## 3. Áreas de Melhoria (Feedback Técnico)

### 3.1. Reutilização de Código e Hooks
- **Problema**: O hook `useAuth` foi criado com lógicas de validação, mas não estava sendo utilizado nas telas de `Login`, `Registro` e `EsqueciSenha`. Isso resultou em duplicação de lógica (validação manual em cada tela).
- **Ação**: Centralizar as validações no `useAuth` e utilizá-lo em todas as telas de autenticação.

### 3.2. Componentização
- **Componentes Não Utilizados**: `CustomInput` e `AppLogo` foram criados mas ignorados nas telas principais.
- **Componentes Vazios**: O arquivo `PasswordInput.tsx` estava vazio.
- **Melhoria Realizada**: Implementei o `PasswordInput` com funcionalidade de "mostrar/esconder senha" e integrei a validação básica no `Login.tsx`.

### 3.3. Navegação e UX
- **Rotas Inexistentes**: O `BottomNavBar` referencia rotas como `Checkin`, `Dados` e `Chat` que ainda não existem no `AppNavigator`. Isso causará erro ao clicar.
- **Esqueci Senha**: A tela de login não possuía link para recuperação de senha, apesar de a tela existir no projeto.
- **Melhoria Realizada**: Adicionei o link "Esqueci minha senha" na tela de login.

### 3.4. Padronização de Nomenclatura
- **Inconsistência**: Pastas como `registro` (minúsculo) versus `Login` (Maiúsculo). 
- **Sugestão**: Adotar `PascalCase` para todas as pastas de componentes e telas (ex: `Registro`, `Login`, `EsqueciSenha`).

## 4. Próximos Passos Sugeridos
1. **Unificar Estilos**: Criar um arquivo `src/theme/colors.ts` para evitar strings de cores espalhadas pelo código.
2. **Implementar Temas**: Dado o uso de cores suaves, um "Dark Mode" seria facilmente implementável se as cores estiverem centralizadas.
3. **Gerenciamento de Estado**: Para dados do usuário e check-ins na `Home`, considere usar **Zustand** ou **Context API** para evitar "Prop Drilling".
4. **Feedback de Erro**: Substituir `Alert.alert` por mensagens de erro em linha nos campos de input para uma melhor experiência do usuário (UX).

---
*Análise realizada em 24 de julho de 2026.*
