# Dependências: web

> Levantamento em modo leitura, 10 e 11/11/2026. Agente `deps_web`, Opus 5.5 (effort high). Nada foi executado além de leitura de código, `npm view/audit/outdated` e documentação pública; "verificado" quer dizer lido no código, não testado. Linhas citadas são do commit `0864143`.

## Resumo

O apps/web está em dia. As 17 dependências diretas estão na última major e nenhuma é deprecada. O npm audit acusa 1 alerta alto, no follow-redirects 1.16.1, que é transitivo via axios 1.20.0. Na web ele não é explorável: o package.json do axios troca o adaptador http por null.js no navegador. Corrige com o axios 1.21.1. O npm outdated mostra só patch/minor: react-query, plugin-react, axios, lucide, react-router e vite. Problema de compatibilidade real: o typescript-eslint 8.72.2 exige typescript <6.1.0, então ESLint com checagem de tipos não funciona com o TS 7.0.2. Para lint, o caminho é Biome ou oxlint (com oxlint-tsgolint). Framework de componentes: a recomendação é a opção (a), manter react-aria-components com os componentes próprios e CSS Modules até a defesa. Tailwind, só depois, pela opção (c), com o plugin oficial. shadcn e MUI ficam fora por quatro motivos: não entregam M3 Expressive; o MUI 9 ainda usa Emotion, que esbarra no CSP style-src 'self'; o Material Web está em modo de manutenção; e o custo é reescrever 55 CSS Modules (3638 linhas).

## Relatório

## Auditoria de dependências do web (apps/web), 2026-11-10

**Estado geral (verificado):** 17 dependências diretas, nenhuma deprecada e todas na última major. O lockfile é v3. As 4 dependências fixadas sem `^` vêm do commit 69f7c44: `@fontsource-variable/roboto-flex`, `@internationalized/date`, `lucide-react` e `react-aria-components`. O dependabot está configurado com grupo semanal de minor/patch (`.github/dependabot.yml`).

| Pacote | Decl. | Inst. | Última (data) | Ação |
|---|---|---|---|---|
| @tanstack/react-query | ^5.105.0 | 5.105.0 | 5.107.1 (11-06) | atualizar |
| axios | ^1.20.0 | 1.20.0 | 1.21.1 (11-09) | atualizar (corrige o audit) |
| @vitejs/plugin-react | ^6.1.2 | 6.1.2 | 6.3.0 (11-09) | atualizar |
| react-router | ^8.5.0 | 8.5.0 | 8.5.1 (10-27) | atualizar |
| vite | ^8.3.5 | 8.3.5 | 8.3.7 (11-09) | atualizar |
| lucide-react | 1.61.0 | 1.61.0 | 1.71.0 (11-10) | manter fixo |
| react / react-dom | ^19.3.1 | 19.3.1 | 19.3.1 | ok |
| react-aria-components | 1.22.1 | 1.22.1 | 1.22.1 | ok |
| @internationalized/date | 3.12.4 | 3.12.4 | 3.12.4 | ok |
| react-hook-form | ^7.91.0 | 7.91.0 | 7.91.0 (v8 em beta) | ok |
| recharts | ^3.10.1 | 3.10.1 | 3.10.1 | trocar depois |
| zod | ^4.6.7 | 4.6.7 | 4.6.7 | ok |
| typescript | ^7.0.2 | 7.0.2 | 7.0.2 | ok |
| roboto-flex, @types/* | | em dia | | ok |

**Audit (verificado):** 1 alerta alto: follow-redirects 1.16.1 (GHSA-mrwp-f3q8-3g9p, CVSS 5.9), transitivo do axios. No bundle do navegador ele não entra: `axios/package.json` "browser" mapeia `lib/adapters/http.js` para `null.js`. Mesmo assim vale subir o axios para 1.21.1, que pede follow-redirects ^1.16.2, para zerar o audit.

**Por que as versões fixas importam (verificado):** o RAC 1.22.1 fixa internamente react-aria 3.53.1 e react-stately 3.51.0, e o `npm ls` mostra uma única `@internationalized/date` deduplicada. Uma segunda cópia quebraria os tipos de data. O DESIGN.md:342 exige refazer o hash do CSP a cada atualização do RAC. No lucide, a fixação protege de ícone renomeado ou removido (42 ícones em 39 arquivos). Regra prática: atualizar RAC e `@internationalized/date` juntos, e lucide só pelo PR do dependabot, com o build rodado.

**Compatibilidade (verificada nos peers):** plugin-react 6.3 pede vite ^8. react-router 8.5.1 pede react >=19.2.7 e node >=22.22 (local: 26.13). Vite 8 usa rolldown ~1.2.18 e lightningcss ^1.33, que faz o downlevel do `light-dark()`. O TS 7.0.2 é binário nativo e só roda no `tsc --noEmit` do build; o Vite transpila sem ele. **Achado:** o typescript-eslint 8.72.2 pede `typescript >=4.8.4 <6.1.0`, então ESLint com checagem de tipos não roda com o TS 7.

**Outras inconsistências (verificadas):**
- `src/rotas/pacientes/Graficos.tsx:56,82,109,135` usa recharts `ResponsiveContainer`, `LineChart` e `BarChart`, contrariando o motivo registrado no DESIGN.md:375.
- O briefing fala em ~35 componentes, mas `src/components/ui` tem 29 `.tsx` (13 importam RAC), e `shell` tem mais 4.
- O web não tem nenhum arquivo de teste.

## Framework de componentes: vale adotar o shadcn/ui?

Estado das opções em 2026-11 (npm view e páginas oficiais, verificado):
- **shadcn 4.23.0** (CLI v4, mar/2026). Base UI virou padrão em jul/2026, Radix continua como opção. Suporta Tailwind v4 e React 19. É código copiado para o projeto, com estética própria (neutra, estilo "SaaS"), **não M3**.
- **@base-ui/react 1.9.0** (o antigo `@base-ui-components/react` foi deprecado) e **radix-ui 1.8.1**: ambos aceitam React 19.
- **RAC + Tailwind:** a documentação oficial tem tailwind-starter e vanilla-starter, e permite instalar exemplos pelo CLI do shadcn. O plugin `tailwindcss-react-aria-components` 2.2.0 (peer tailwindcss ^4) é opcional no v4, porque `data-[selected]:` já funciona; o plugin só encurta para `selected:`. Instalação: `@plugin "tailwindcss-react-aria-components";`. Tailwind 4.3.5 e `@tailwindcss/vite` (peer vite ^8) também conferidos.
- **MUI 9.5.0** (v9 lançada em 2026-04-08): o post de lançamento não menciona M3 nem Expressive, e o Emotion continua (removê-lo está nos próximos passos). Emotion injeta `<style>` em tempo de execução. *Suspeita forte, não testada:* isso quebra o `style-src 'self'` de produção (DESIGN.md:339) sem um esquema de nonce.
- **@material/web 2.5.0:** o README diz "MWC is in maintenance mode pending new maintainers". É M3 base, sem Expressive.
- **M3E (@m3e/react 2.12.0):** web components M3 Expressive, MIT, 1 mantenedor no npm, primeira publicação em 2026-02. É o mais fiel ao Expressive, mas o risco de manutenção é alto.
- **Outras:** HeroUI 3.2.7 é RAC + Tailwind v4, mas com estética própria e peers fixando RAC ^1.22.1. Mantine 9.8, Ark UI 5.40 e Spectrum S2 1.8 não trazem M3.

| Critério | (a) RAC + próprios | (b) shadcn | (c) RAC + Tailwind | (d) MUI/MWC/M3E |
|---|---|---|---|---|
| Fidelidade ao M3 Expressive | alta (já feita) | baixa | alta, se portada | média/baixa/alta |
| Acessibilidade | RAC; axe ok (DESIGN.md:212) | boa | RAC | boa/boa/não verificada |
| Custo de migração | zero | reescrever tudo | 55 CSS Modules, 3638 linhas | reescrever tudo |
| Risco na reta final | mínimo | alto | médio | alto |
| Manutenção | Adobe, ativa | ativa | ativa | ativa*/parada/1 pessoa |
| Curva para iniciantes | já conhecida | CLI fácil, mas o código é deles | utilitários e variantes | API grande |

**Recomendação única: (a).** Manter react-aria-components com os componentes próprios e CSS Modules até a entrega. O shadcn resolveria um problema que o projeto não tem: os primitivos acessíveis já vêm do RAC. Ele também trocaria a linguagem M3 Expressive, já documentada e validada, por outra estética. Se o grupo ainda quiser Tailwind depois da defesa, o caminho é **(c)**: manter o JSX do RAC, mapear `tokens.css` em `@theme` e migrar componente por componente, com o plugin oficial. Não trocar de biblioteca.

## Outras alternativas

- **Gráficos:** manter o recharts por ora. Depois, levar os 3 gráficos do perfil para o GraficoLinhas e barras em SVG, e remover o pacote.
- **axios vs fetch:** manter o axios 1.21.1. O interceptor de refresh com renovação única (`src/lib/api.ts`) já está correto, e reescrever com fetch só traz risco.
- **Ícones:** manter o lucide pela coerência com o mobile (DESIGN.md:367). O Material Symbols (`@material-symbols/svg-400` 0.48.3) seria mais "M3", mas custa 42 ícones e quebra a paridade com o mobile.
- **Testes:** Vitest 5.1 (peer vite ^8) + Testing Library 16.3 para `api.ts`, `erros.ts` e formulários. Playwright 1.65 com axe em 2 ou 3 fluxos.
- **Lint/format:** Biome 2.6.6, uma ferramenta só e sem depender da API do TS. O oxlint 1.93 é a alternativa: o modo type-aware via oxlint-tsgolint pede >=7.0.2005, mas falta o formatador. ESLint fica descartado enquanto o typescript-eslint não aceitar o TS 7.

**Limitações:** não rodei build nem testes (modo leitura). A incompatibilidade MUI/Emotion com o CSP foi inferida, não testada. O README do plugin no npm veio vazio (o WebFetch levou 403); usei a página de styling do React Aria.

## npm audit e outdated

npm --prefix apps/web audit: 1 vulnerabilidade, severidade alta (0 crítica, 0 moderada, 0 baixa) em 154 dependências. follow-redirects 1.16.1 (transitivo de axios 1.20.0), GHSA-mrwp-f3q8-3g9p, CWE-201, CVSS 5.9, range >=1.16.0 <=1.16.1, fixAvailable. Impacto real nulo no navegador, porque axios/package.json "browser" mapeia ./lib/adapters/http.js para ./lib/helpers/null.js. Correção: axios 1.21.1 (pede follow-redirects ^1.16.2; a última é 1.16.3, de 2026-11-08). npm outdated: react-query 5.105.0→5.107.1, plugin-react 6.1.2→6.3.0, axios 1.20.0→1.21.1, lucide 1.61.0→1.71.0 (wanted=current porque está fixado), react-router 8.5.0→8.5.1, vite 8.3.5→8.3.7.

## Pacotes

| Pacote | Declarada | Instalada | Última | Defasagem | Vulnerabilidades | Ação | Justificativa |
|---|---|---|---|---|---|---|---|
| @fontsource-variable/roboto-flex | 5.3.0 (fixa) | 5.3.0 | 5.3.0 (2026-07-19) | nenhuma | nenhuma | manter | Self-hosted por LGPD (DESIGN.md:119,366). Fixar a versão evita mudança do arquivo de fonte sem revisão. |
| @internationalized/date | 3.12.4 (fixa) | 3.12.4 | 3.12.4 (2026-09-01) | nenhuma | nenhuma | manter | Precisa andar junto com o RAC (que pede ^3.12.4). O npm ls mostra uma única cópia deduplicada; uma cópia duplicada quebraria os tipos de CalendarDate. Atualizar sempre junto com o RAC. |
| @tanstack/react-query | ^5.105.0 | 5.105.0 | 5.107.1 (2026-11-06) | 2 minors | nenhuma | atualizar | Minor seguro; peer react ^18\|\|^19. |
| axios | ^1.20.0 | 1.20.0 | 1.21.1 (2026-11-09) | 1 minor | transitiva: follow-redirects 1.16.1, GHSA-mrwp-f3q8-3g9p (high, CVSS 5.9); não entra no bundle do navegador | atualizar | O 1.21.1 exige follow-redirects ^1.16.2 e zera o audit. Uso pequeno: 1 instância e o interceptor de refresh em src/lib/api.ts (54 linhas), mais isAxiosError em 7 arquivos. Trocar por fetch não compensa agora. |
| lucide-react | 1.61.0 (fixa) | 1.61.0 | 1.71.0 (2026-11-10) | 10 minors em ~20 dias | nenhuma | manter | Fixar a versão protege de ícone renomeado ou removido. 42 ícones distintos em 39 arquivos. É a mesma família do mobile (DESIGN.md:367). Atualizar só pelo PR do dependabot, com o build rodado antes. |
| react | ^19.3.1 | 19.3.1 | 19.3.1 (2026-10-14) | nenhuma | nenhuma | manter | Atende o peer >=19.2.7 do react-router 8. |
| react-dom | ^19.3.1 | 19.3.1 | 19.3.1 | nenhuma | nenhuma | manter | Mesma versão do react. |
| react-aria-components | 1.22.1 (fixa) | 1.22.1 | 1.22.1 (2026-10-09) | nenhuma | nenhuma | manter | O próprio RAC fixa react-aria 3.53.1 e react-stately 3.51.0. A fixação também importa por causa do CSP: o hash do <style> touch-action precisa ser refeito a cada atualização (DESIGN.md:342). Usado em 13 componentes de ui. |
| react-hook-form | ^7.91.0 | 7.91.0 | 7.91.0 (2026-10-23) | nenhuma | nenhuma | manter | Não migrar para o 8.0.0-beta na reta final. |
| react-router | ^8.5.0 | 8.5.0 | 8.5.1 (2026-10-27) | 1 patch | nenhuma | atualizar | Peer react >=19.2.7 e @types/react >=19.2.0 atendidos; engines node >=22.22.0 (local: 26.13.0). |
| recharts | ^3.10.1 | 3.10.1 | 3.10.1 (2026-07-25) | nenhuma | nenhuma | trocar_depois | Só em src/rotas/pacientes/Graficos.tsx: 1 LineChart e 2 BarChart com ResponsiveContainer. Isso contradiz o motivo do DESIGN.md:375 (ResponsiveContainer não acompanha a impressão). Os 3 gráficos podem migrar para GraficoLinhas mais barras em SVG próprio; não é prioridade. |
| zod | ^4.6.7 | 4.6.7 | 4.6.7 (2026-10-12) | nenhuma | nenhuma (subida para 4.6.7 pelo GHSA-mrhx-c7xc-m3w5, commit 8f9c6ee) | manter | Em dia. |
| @types/react | ^19.3.0 | 19.3.0 | 19.3.0 | nenhuma | nenhuma | manter | Em dia. |
| @types/react-dom | ^19.3.0 | 19.3.0 | 19.3.0 | nenhuma | nenhuma | manter | Em dia. |
| @vitejs/plugin-react | ^6.1.2 | 6.1.2 | 6.3.0 (2026-11-09) | 2 minors | nenhuma | atualizar | Peer vite ^8.0.0. Os demais peers (babel, react-compiler, oxc) não estão em uso. |
| typescript | ^7.0.2 | 7.0.2 | 7.0.2 (publicado em 2026-07-08) | nenhuma (7.1.0-beta existe) | nenhuma | manter | Só usado no `tsc --noEmit` do build; o Vite transpila sem o TS. Efeito colateral: o typescript-eslint 8.72.2 pede typescript <6.1.0, então não há ESLint type-aware. |
| vite | ^8.3.5 | 8.3.5 | 8.3.7 (2026-11-09) | 2 patches | nenhuma | atualizar | Vite 8 usa rolldown ~1.2.18 e lightningcss ^1.33 (este último faz o downlevel de light-dark(), DESIGN.md:330); node ^20.19 \|\| >=22.12. |

## Alternativas avaliadas

| Tema | Opções | Recomendação | Custo | Justificativa |
|---|---|---|---|---|
| Framework de componentes | (a) RAC + componentes próprios; (b) shadcn/ui 4.23 (Base UI 1.9 como padrão desde jul/2026, ou radix-ui 1.8) + Tailwind; (c) RAC + Tailwind (starters oficiais, tailwindcss-react-aria-components 2.2.0); (d) MUI 9.5, @material/web 2.5, @m3e/react 2.12; (e) HeroUI 3.2.7 (sobre RAC + Tailwind v4), Mantine 9.8, Ark UI 5.40, React Spectrum S2 1.8 | (a) até a defesa; se migrar para Tailwind depois, (c) | a: zero; c: reescrever 55 CSS Modules (3638 linhas) mantendo o JSX do RAC; b/d: reescrever componentes e tela | Os componentes já cumprem M3 Expressive (molas, morph, state layers) com axe sem violações (DESIGN.md:212). shadcn e HeroUI trazem a estética deles, não a M3. O MUI não implementa M3/Expressive e mantém o Emotion, incompatível com o CSP sem nonce. O Material Web está em modo de manutenção. O M3E é Expressive de verdade, mas tem 1 mantenedor no npm. |
| Gráficos | recharts 3.10.1 vs GraficoLinhas SVG próprio | manter o recharts agora; depois, migrar os 3 gráficos de Graficos.tsx para SVG próprio e remover a dependência | baixo-médio (barras horizontal e vertical) | O GraficoLinhas já resolve a impressão; o recharts sobrou só no perfil e usa justamente o ResponsiveContainer que o DESIGN.md rejeita. |
| HTTP | axios vs fetch | manter o axios 1.21.1 | trocar: médio, toca 8 arquivos | O interceptor de refresh com renovação única em voo é a parte delicada; refazer com fetch não traz ganho de segurança. |
| Ícones | lucide-react vs @material-symbols/svg-400 0.48.3 | manter o lucide | trocar: 42 ícones em 39 arquivos | Coerência com o mobile (Feather) já decidida (DESIGN.md:367); trocar não muda a função. |
| Testes | Vitest 5.1 + Testing Library 16.3 + jsdom; Playwright 1.65 | Vitest + Testing Library para api.ts/erros.ts e formulários; Playwright + axe em 2 ou 3 fluxos (login, perfil, relatório) | baixo | O web tem 0 testes; o Vitest usa o próprio Vite 8 (peer ^8). |
| Lint/format | ESLint 10 + typescript-eslint; Biome 2.6.6; oxlint 1.93 + oxlint-tsgolint | Biome | baixo | Uma ferramenta para lint e formatação, bom para iniciantes; o typescript-eslint é incompatível com o TS 7; o oxlint exige ferramenta extra de formatação. |

## Fontes

- https://registry.npmjs.org (npm view, consultado em 2026-11-10)
- https://github.com/advisories/GHSA-mrwp-f3q8-3g9p
- https://ui.shadcn.com/docs/changelog
- https://react-aria.adobe.com/getting-started
- https://react-aria.adobe.com/styling
- https://github.com/material-components/material-web
- https://mui.com/blog/introducing-material-ui-v9/
- https://github.com/mui/material-ui/issues/29345
- https://github.com/matraic/m3e
- apps/web/package.json
- apps/web/package-lock.json
- apps/web/DESIGN.md
- apps/web/src/lib/api.ts
- apps/web/src/rotas/pacientes/Graficos.tsx
- .github/dependabot.yml
