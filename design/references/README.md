# Arsenal visual comentado

Consulta em 10/11/2026. **Produto real** significa que o padrão existe num produto/documentação pública; não significa que sua interface esteja validada para o Anchieta. **Conceito** significa inspiração visual, sem prova de funcionamento. Capturas/imagens são material de estudo com autoria preservada, não assets a embarcar no aplicativo final. Não copiar marca, texto de clientes ou código proprietário.

## Seleção e aplicação

| ID | Referência verificada | Tipo/evidência | Aproveitar | Aplicar em |
|---|---|---|---|---|
| V01 | [Intercom Inbox](https://www.intercom.com/helpdesk/inbox) | Produto; tela pública inspecionada e imagem local | Conversa central, contexto lateral e ações próximas | Atendimento |
| V02 | [Intercom Copilot](https://www.intercom.com/help/en/articles/8587194-how-to-use-copilot) | Documentação oficial | Fontes próximas da sugestão | Copiloto |
| V03 | [Attio Records](https://attio.com/help/reference/managing-your-data/records/create-and-view-records) | Documentação oficial | Registro único e detalhe acessível pela lista | Aluno e evidências |
| V04 | [Attio Table Views](https://attio.com/help/reference/managing-your-data/views/create-and-manage-table-views) | Documentação oficial | Filtros/colunas como ferramentas de trabalho | Alunos e ofertas |
| V05 | [Linear Dashboards](https://linear.app/docs/dashboards) | Documentação e imagem local | Densidade, hierarquia e navegação discreta | Listas e painéis |
| V06 | [Linear Insights](https://linear.app/insights) | Página pública inspecionada | Relacionar métricas e exploração | Resultados |
| V07 | [shadcn Dashboard Blocks](https://ui.shadcn.com/blocks/dashboard) | Componentes reais de implementação | Shell e primitivas; adaptar completamente | Estrutura base |
| V08 | [Pinterest: CRM Dashboard Concept](https://www.pinterest.com/pin/581105158207483481/) | Pin com autoria indicada a Creativilo; inspeção limitada por login | Separação de áreas, branco e ritmo visual | Moodboard de gestão |
| V09 | [CRM Dashboard, Behance](https://www.behance.net/gallery/180906513/CRM-Dashboard) | Conceito; imagem local inspecionada | Unidade de azul e hierarquia dos dados | Vocabulário visual |
| V10 | [Inbox Design Study, Murilo F. Souza](https://dribbble.com/shots/26030316-Inbox-Design-Study-for-an-Omnichannel-Platform) | Autor identifica estudo fictício | Estados light/dark e controles de inbox | Atendimento |
| V11 | [CRM examples, SaaSUI](https://www.saasui.design/crm-dashboard-ui-design) | Curadoria secundária de telas | Descoberta complementar de padrões | Pesquisa posterior |

Não copiar do conceito Behance o excesso de cores, o donut sobreposto ou a composição de marketing. Não copiar do pin verde sua cor de marca. A paleta e o conteúdo do Continua são próprios do Anchieta.

## Evidências locais

| Arquivo | Origem exata | Observação |
|---|---|---|
| `intercom-inbox.png` | [Asset da página oficial](https://cdn.sanity.io/images/4bgok82s/monorepo-static-assets/b1b18a305bbce7f039c68bbdb044841365045a98-2436x1624.webp) | Imagem de divulgação do Inbox; extensão ajustada à codificação recebida |
| `linear-dashboard.png` | [Asset da documentação oficial](https://webassets.linear.app/images/ornj730p/production/71f0619607a00ecd4486a66340fa0ec12f38fd97-2016x1036.png?auto=format&dpr=2&q=95&w=1440) | Mostra lista de dashboards; transporte AVIF convertido para PNG, sem mudança de conteúdo |
| `crm-blue-behance.png` | [Asset do projeto](https://mir-s3-cdn-cf.behance.net/project_modules/1400/209282180906513.6512d71dd8966.png) | Conceito visual, não produto comprovado |

## Pinterest: o que foi possível validar

Foi feita pesquisa direcionada por CRM, blue dashboard, inbox e SaaS; a cobertura do buscador retornou poucos pins e muitos resultados externos. O pin V08 abriu com imagem/título/atribuição e uma janela de login que limitou a inspeção. Não há alegação de navegação completa, teste do layout ou seleção de vários pins validados. Para ampliar depois em conta autorizada, pesquisar: `CRM dashboard clean blue`, `student CRM profile`, `support inbox AI copilot`, `data table filters enterprise`, `dashboard dark mode navy`.

A limitação não foi preenchida com URLs de pins inventados. O núcleo funcional da direção visual está em produtos/documentação verificáveis; Pinterest serve como guia estético complementar.

## Como usar no VS Code

Antes de construir atendimento, abrir V01/V02 e o SVG autoral de atendimento. Antes do radar, abrir V04/V05 e o SVG autoral de radar. Registrar em `implementation/status.md` a decisão adotada. Não carregar todas as imagens e toda a pesquisa em cada rodada de contexto.
