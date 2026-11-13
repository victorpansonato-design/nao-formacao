# Painel da Diretoria/Gestão

Primeira tela do perfil Diretoria/Gestão: rota `/visao-geral`, rótulo **Painel** na navegação. Decisão de 12/11/2026 (ver `00-decisoes.md`). Código em `src/features/dashboard/`.

## Para que serve

Responder em uma tela, sem rolar: quantos alunos foram afetados, quantos já foram contatados, quantos viraram para outro curso, como está cada consultor e quais turmas estão ofertadas. O cadastro Sim/Não das turmas também é feito daqui.

## Fonte única dos números

Todos os números vêm de `leadershipPanel(state)` em `src/domain/panel.ts`. Nenhum componente conta casos por conta própria.

- **Afetado**: mesma definição do funil (`isAffected`, `src/domain/metrics.ts`): matriculado em turma marcada Não ofertado, sem duplicatas.
- Os afetados são **particionados** por situação (`sliceOf`). A soma das fatias é igual aos afetados.
- **Contatado** = saiu de "aguardando primeiro contato" (etapa `ready`). Contatados + a contatar = afetados.
- **Virado** = troca para outra turma ofertada realizada no Lyceum e confirmada (etapa `converted`). Aceite da proposta sozinho não conta; aparece como "aceitou, aguarda a troca".

Testes: `src/domain/panel.test.ts`.

## Blocos

| Bloco | Componente | O que mostra | Abre |
|---|---|---|---|
| Alunos afetados | `KpiTiles.tsx` | Total de afetados e quantas turmas não ofertadas | `/alunos?kpi=affected` |
| Primeiro contato | `KpiTiles.tsx` | Contatados, % sobre afetados, a contatar, barra | `/alunos?kpi=awaitingFirstContact` (a contatar) |
| Virados para outro curso | `KpiTiles.tsx` | Virados, % sobre afetados, e quantos aceitaram e aguardam a troca | `/alunos?kpi=converted`, `/alunos?kpi=awaitingExecution` |
| Situação dos afetados | `SituationCard.tsx` | Rosca (`Donut`) com a partição e legenda com valor e % | Cada fatia com lista correspondente abre `/alunos?kpi=…` |
| Equipe | `TeamCard.tsx` | Uma linha por consultor, pelo nome: alunos sob responsabilidade, contatados/a contatar, virados e conversão sobre a própria carteira | — |
| Catálogo de cursos | `CatalogCard.tsx` | Ofertadas, não ofertadas, cursos, novos; poucas linhas de curso com Sim/Não por turno | "Ver catálogo completo" abre o pop-up |

Fatias da rosca, na ordem: Virados para outro curso (`converted`), Aceitou, aguarda a troca (`awaitingExecution`), Em atendimento (sem lista própria), A contatar (`awaitingFirstContact`), Pediu devolução (`exitRequested`), Sem contato (`unreachable`), Outros desfechos (só aparece se maior que zero). A cor acompanha a situação, não a posição.

## Catálogo no painel e pop-up

- O cartão mostra cerca de 5 linhas (entre 3 e 9, conforme a altura disponível no desktop): primeiro cursos com turma não ofertada, depois cursos com matriculados, depois ordem alfabética.
- Cada linha: curso, selo "Novo", modalidade real e um `OfferSwitch` por turno.
- `CatalogDialog` abre quase em tela cheia: busca por curso, botões **Todos / Ofertados / Não ofertados** com contagem, agrupamento por modalidade, uma linha por curso com os turnos.
- Marcar Não ofertado com alunos ou propostas afetados pede confirmação mostrando os números (`previewDecision`) antes de gravar (`recordDecision`). Sem impacto, grava no clique. Detalhes em `02-processo.md`.

## Layout

- Desktop a partir de **1280 × 660 px** (variante `fit` em `src/app/styles.css`): o painel ocupa exatamente a área sob a barra superior, **sem rolagem vertical**. Cabeçalho e índices com altura própria; a linha de cartões fica com o restante. Listas internas se ajustam à altura, não rolam a página.
- Abaixo disso (largura menor que 1280 ou altura menor que 660), os blocos empilham e a página rola.
- Mudança que faça o painel rolar no desktop é defeito.

## Animação

- Números sobem gradualmente (`CountUp`); a rosca se preenche (`Donut`); linhas entram em sequência (`motion-stagger`). Quando o dado muda, o número vai do valor exibido ao novo, sem recomeçar.
- Com movimento reduzido, os valores finais aparecem de imediato. O valor real está sempre disponível para leitores de tela.
- Componentes e durações em `design/motion.md` (catálogo) e `src/shared/motion/data.tsx`.

## Estado vazio

Sem afetados, os blocos de situação e equipe dão lugar a um aviso ("Nenhuma turma marcada como não ofertada" ou "Nenhum aluno afetado", quando as turmas não ofertadas não têm matriculados) com o botão **Abrir o catálogo**. O cenário Antecipação mostra esse estado.

## Peças compartilhadas: reutilizar, não recriar

| Peça | Arquivo | Onde já é usada |
|---|---|---|
| `OfferSwitch` | `src/features/offerings/OfferSwitch.tsx` | Painel, pop-up do catálogo, detalhe da turma |
| `CatalogDialog` | `src/features/offerings/CatalogDialog.tsx` | Painel |
| `buildCatalog`, `OFFER_FILTERS` | `src/features/offerings/catalog.ts` | Painel, pop-up, aba Ofertas |
| `CountUp`, `Donut` | `src/shared/motion/data.tsx` | Painel |
| `ConfirmTransfer` | `src/features/cases/ConfirmTransfer.tsx` | Atendimento, detalhe da proposta |

## Como estender

1. Defina a métrica em `src/domain/panel.ts`, a partir das mesmas entidades e de `isAffected`. Se ela tiver lista, use uma chave existente de `/alunos?kpi=…` ou crie a chave em `src/domain/metrics.ts`.
2. Escreva o teste de reconciliação em `panel.test.ts` (soma das fatias, contatados + a contatar).
3. Só então mostre no componente, com `CountUp` para números.
4. Confira que o painel continua sem rolar em 1280×720, 1366×768, 1440×900 e 1920×1080, e que empilha em 390×844.

## Limites

- Entre 1024 e 1279 px de largura, ou abaixo de 660 px de altura, empilha e rola.
- Verificado apenas no Chrome. Sem teste com usuários.
- Evidências visuais em `implementation/evidence/dashboard/`.
- Números de alunos são sintéticos; o cenário em que o sistema abre (Em andamento) foi montado para o painel ter o que mostrar.
