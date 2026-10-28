# Escalas: textos a conferir antes da avaliação com psicólogos

Os enunciados estão em `migrations/0005_escalas.sql`. O sistema mostra só o score bruto, nunca uma classificação.

| Escala | Fonte usada | O que conferir |
|---|---|---|
| PHQ-9 | Reprodução da versão brasileira no livro "Vencendo a depressão" (Grupo A). O PDF oficial pt-BR do phqscreeners.com não estava acessível. | Comparar os 9 itens e as opções com o PDF oficial Pfizer pt-BR. O texto foi ajustado: "(a)" no lugar de "/a", ortografia de "frequência", travessões trocados por vírgula, e no item 2 "Se sentir" em vez de "Se sentiu". O item 10 (dificuldade funcional) ficou de fora porque não pontua. |
| GAD-7 | PDF oficial Pfizer pt-BR (hospedado pela USP/FMRP). | Conferido. `validacao_ref` diz "Sousa et al. (2015)", que é a validação de Portugal; avaliar se troca por Moreno et al. (2016) ou outra validação brasileira. |
| PHQ-2 | Itens 1 e 2 do PHQ-9. | Segue o PHQ-9. |
| DASS-21 | Reprodução secundária (formulário online), cruzada com a versão de Vignola e Tucci (2014). O artigo não estava acessível. | Item 13 ("Senti-me depressivo(a), sem ânimo"; pode ser "e sem ânimo") e opção 0 ("Não se aplicou de maneira nenhuma"; pode ser "de maneira alguma"). A instrução diz "escolha" em vez de "circule". |

O item 9 do PHQ-9 grava `item9_diferente_de_zero` (migração 0007). A web mostra esse marcador de forma neutra, e o mobile oferece CVV 188 / SAMU 192 ao paciente.
