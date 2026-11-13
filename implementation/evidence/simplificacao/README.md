# Simplificação da interface

11/11/2026. Aplicação local com dados sintéticos. O usuário confirmou a prioridade: **cada perfil vê suas pendências e a próxima ação**. As decisões duráveis estão em [PRODUCT.md](../../../PRODUCT.md) e [DESIGN.md](../../../DESIGN.md).

## Escopo e decisões

Revisão da estrutura do produto, contratos de fluxo, navegação, componentes compartilhados e telas por feature. A inspeção renderizada cobriu as rotas principais e seis tipos de detalhe nos dois temas; as imagens de avaliação visual se concentram nas entradas por perfil, atendimento e devolução. Não se afirma inspeção visual manual de cada estado de cada formulário.

| Impacto | Localização | Antes | Alteração | Efeito esperado |
|---|---|---|---|---|
| Médio | `src/app/shell/Sidebar.tsx:53` | Todas as áreas e ferramentas competiam no menu | 2–3 áreas frequentes por perfil, Outras áreas e ferramentas separadas | Menos escolhas simultâneas, rotas preservadas |
| Médio | `design/tokens.css:2`, `src/app/styles.css:9` | Superfícies azuladas, sidebar saturada e placas de estado | Neutros quentes no claro, grafite no escuro, azul pontual, estados em texto/ícone | Menor disputa visual com o conteúdo |
| Médio | `src/shared/ui/primitives.tsx:31` | Descrições extensas repetidas em cada tela e painel | Informação complementar por botão nomeado | Leitura opcional, erros e bloqueios permanecem explícitos |
| Médio | `src/features/overview/OverviewPage.tsx:33` | Indicadores, diagnósticos e todos os destinos simultâneos | Pendência prioritária, resumo compacto e lista de trabalho | Ação seguinte reconhecível na entrada |
| Médio | `src/features/cases/CaseWorkbenchPage.tsx:28` | Três regiões com contexto, formulários, alternativas e copiloto ao mesmo tempo | Conversa e ferramentas em abas; dados em gaveta | Menos informação simultânea, rascunho preservado |
| Médio | `src/features/offerings/OfferingsPage.tsx:54` | Dez colunas com redundância analítica e vários filtros abertos | Oferta, matrículas, cenário, referência e decisão; filtros recolhidos | Lista mais fácil de percorrer; análise completa no detalhe e CSV |
| Médio | `src/features/academic/TasksPage.tsx:61`, `src/features/refunds/RefundsPage.tsx:19` | Fila misturava abertos e concluídos na entrada operacional | Abertos como padrão para o executor e atalho para o próximo registro | Execução antes de consulta histórica |

Esses efeitos são objetivos de desenho, não ganhos de tempo medidos com usuários. As regras de elegibilidade, alçada, saldo, idempotência, aceite e efetivação continuam nos comandos existentes. Nenhuma funcionalidade de negócio foi removida.

## Skills e cobertura

- **Impeccable:** contexto do repositório, redução de complexidade, intensidade visual, modo Operate e critérios de execução. Detector executado uma vez sobre `src/app`, `src/shared` e `src/features`: `[]`.
- **Better Colors:** tokens semânticos, separação de link e fundo de ação no escuro, medição de pares renderizados.
- **Fixing Accessibility e React best practices:** controles nomeados, foco, popovers, abas, rascunho e estado derivado; verificação pelos testes abaixo.
- **Better Interface:** usado para organizar achados e delimitar cobertura. Os owners `better-accessibility`, `better-layout`, `better-writing`, `better-typography` e `better-ui` não estavam disponíveis no catálogo local. Não se reivindica uma revisão especializada completa por esses cinco owners. As verificações concretas de acessibilidade e o trabalho de hierarquia/copy usaram as skills disponíveis citadas acima.
- **Browser:** `agent-browser` não estava instalado; foi usado Playwright já presente no lockfile, sem instalar ferramentas remotas.

## Verificação final

| Comando/ação | Observado |
|---|---|
| `npm run typecheck` | Aprovado |
| `npm run lint` | Aprovado |
| `npm test` | 26 testes aprovados |
| `npm run test:e2e` | 14 testes aprovados, aproximadamente 1,2 minuto |
| `npm run build` | Aprovado; chunk principal aprox. 1,31 MB / 210 kB gzip |
| `python scripts/validate_planning.py` | Links, base e cálculos aprovados |
| Detector Impeccable | Nenhum achado mecânico no recorte executado |
| `node scripts/inspect-simplification.mjs` | Quatro entradas em claro/escuro, sem exceção de página capturada; relatório JSON abaixo |

Os 14 E2E cobrem conteúdo das rotas, reconciliação dos indicadores, seis papéis, continuidade até ajuste, devolução até comprovante, decisão, aprovação, importação idempotente, política/nova campanha, réguas, mobile 390 px, filtros por teclado e rascunho preservado entre abas/gaveta. A busca e os filtros continuam persistindo na URL.

## Contraste medido

[Relatório renderizado](inspecao-renderizada.json): 48 nós de texto na entrada de Gestão, 52 no Consultor, 94 no Suporte e 60 no Financeiro, em cada tema; **508 verificações**, sem pares abaixo de 4,5:1 para texto normal ou 3:1 para texto grande no recorte. O script compõe fundos e cor do texto a partir de estilos computados, exclui conteúdo recolhido e controles desabilitados. Há três links principais visíveis em cada uma dessas quatro entradas.

Isso não mede todos os placeholders, SVGs, hover/focus, overlays ou estados de erro e não substitui auditoria WCAG. Os testes de teclado verificaram filtros, fechamento/foco do popover e salto ao conteúdo. Não foram realizados teste com leitor de tela, zoom de navegador a 200%, outros navegadores ou estudo de usabilidade com colaboradores.

## Capturas reais

| Superfície | Claro | Escuro |
|---|---|---|
| Gestão | [Entrada](entrada-gestao-light.png) | [Entrada](entrada-gestao-dark.png) |
| Consultor | [Entrada](entrada-consultor-light.png) | [Entrada](entrada-consultor-dark.png) |
| Suporte | [Entrada](entrada-suporte-light.png) | [Entrada](entrada-suporte-dark.png) |
| Financeiro | [Entrada](entrada-financeiro-light.png) | [Entrada](entrada-financeiro-dark.png) |
| Visão de trabalho | [Tela](operacao-light.png) | [Tela](operacao-dark.png) |
| Atendimento | [Tela](atendimento-light.png) | [Tela](atendimento-dark.png) |
| Devolução | [Tela](devolucao-light.png) | [Tela](devolucao-dark.png) |

[Atendimento mobile](atendimento-mobile.png). Desktop 1440 px; entradas por perfil com altura de 960 px, capturas E2E com 1000 px; mobile 390 × 844.

## Veredito no recorte

Sem bloqueio funcional observado nos percursos executados. Aprovação restrita a esse escopo; permanecem os limites de cobertura acima e a necessidade de validar a compreensão da nova organização com os usuários do piloto. Nenhum ganho operacional, resultado de retenção ou performance foi inventado.
