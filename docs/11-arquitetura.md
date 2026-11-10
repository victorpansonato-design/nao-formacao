# Arquitetura do front-end

## Escolha técnica

**TypeScript em modo strict + React estável + Vite** é a escolha proposta para este protótipo: bom ecossistema de UI, execução local simples e módulos fáceis de evoluir. Não existe linguagem universalmente “melhor”; esta escolha atende o escopo de SPA funcional sem backend. Não introduzir SSR ou uma plataforma de agentes apenas para demonstrar o fluxo.

| Camada | Escolha | Uso |
|---|---|---|
| UI | React + TypeScript strict | Componentes e estados explícitos |
| Build | Vite | SPA local e build estático |
| Estilo | Tailwind CSS e tokens CSS | Tema institucional centralizado |
| Primitivas | shadcn/ui, escolhendo uma base consistente | Dialog, combobox, tabs, menu e formulário acessíveis |
| Navegação | React Router | Rotas e filtros na URL |
| Estado de domínio | Zustand com persistência versionada | Entidades e comandos da demo |
| Validação | Zod | Imports, formulários e fronteiras de dados |
| Tabelas | TanStack Table | Filtros, ordenação, seleção e paginação |
| Gráficos | Recharts | Curvas, barras e faixas com alternativa tabular |
| Motion | Motion for React e CSS | Mudança de layout e presença |
| Ícones | Lucide | Vocabulário único, rótulos acessíveis |
| Verificação | Vitest + Testing Library + Playwright | Regras críticas e fluxos do usuário |

Na instalação, consultar a documentação correspondente às versões estáveis escolhidas, verificar compatibilidade e congelar lockfile. Não misturar exemplos de TanStack v8/v9, Tailwind de versões diferentes ou dependências experimentais. Não assumir que um componente 21st funciona sem adaptação. Não fixamos versões “atuais” não testadas neste planejamento.

## Organização proposta

- `src/app/`: router, providers, shell e entrada.
- `src/features/forecast/`, `offerings/`, `cases/`, `copilot/`, `proposals/`, `academic/`, `refunds/`, `campaigns/`, `analytics/`: telas, componentes e hooks específicos.
- `src/domain/`: tipos, políticas, cálculos, elegibilidade, fila e transições puras.
- `src/services/contracts/`: interfaces de repositórios.
- `src/services/local/`: implementação local com simulações de atraso/falha configuráveis.
- `src/shared/ui/`: primitivas de UI, sem regras de negócio.
- `src/shared/motion/`, `format/`, `lib/`: tokens de movimento, moeda/data e utilitários pequenos.
- `src/data/`: importação da base sintética versionada.
- `src/test/` e `e2e/`: fixtures e testes dos fluxos críticos.

Evitar camadas vazias, pastas para um arquivo trivial e componentes genéricos com dezenas de booleans. Extrair por responsabilidade e mudança provável, não por uma cota arbitrária de linhas. Uma mudança de alçada deve alterar política, não cinco telas. Uma mudança de azul deve alterar token, não cada botão.

## Fluxo de estado

UI solicita comando → serviço verifica papel, versão e pré-condições → função de domínio calcula transição → store persiste alteração e evento juntos → seletores recalculam painel/fila. Nenhum componente muda status por atribuição direta. Erro retorna código e mensagem acionável; não depende de texto para lógica.

Comandos principais: `recordDecision`, `claimNextCase`, `recordInteraction`, `updatePreference`, `createProposal`, `requestApproval`, `decideApproval`, `acceptProposal`, `scheduleReturn`, `transferCase`, `completeAcademicTask`, `requestRefund`, `completeRefund`, `closeCampaign`.

Cada comando recebe `commandId`, `actor`, `expectedVersion` quando aplicável e `clock`. Repetição do mesmo `commandId` retorna resultado anterior; versão obsoleta retorna conflito sem sobrescrever. Guardas do front são para demonstração; produção deve repetir a autorização no servidor.

## Persistência e reprodução

Um store de domínio normalizado e um store pequeno de preferências. Estado inicial vem do JSON sintético. Persistência com `schemaVersion`, migração explícita e recuperação de dados inválidos oferecendo restaurar demo, sem travar a aplicação. Não recalcular/serializar 500 registros a cada tecla do composer; rascunho local e escrita só no momento adequado.

Relógio injetável controla proposta expirada, reserva, SLA, D+7/D+30 e fases. No uso normal, hora atual. Na apresentação, relógio fixo com badge “Cenário simulado em 27/01/2027”. Nunca mostrar dado futuro como observado em novembro.

Criar presets `anticipation`, `operation`, `aftercare`, `closed`. Cada preset restaura uma base coerente e mostra o que altera. A troca pede confirmação local se houver trabalho fictício não salvo. É ferramenta de apresentação, não recurso de produção.

## Copiloto da demonstração e futuro

Contrato `CopilotService.suggest(context): SuggestionBundle`. Implementação local escolhe respostas e ramificações dos exemplos; identifica fontes sintéticas e condições. Resultado inclui `facts`, `questions`, `suggestedReply`, `branches`, `evidenceIds`, `limitations`, `mode: simulated`.

Implementação futura com LLM fica atrás do mesmo contrato, no servidor, com recuperação de catálogo e CRM, resposta estruturada, validação de elegibilidade e alçada e revisão do consultor. Chaves nunca ficam no front. Conteúdo recuperado não pode executar ferramentas nem substituir política. Não usar IA generativa para validar centavos ou disponibilidade.

## Performance e manutenção

Paginar tabelas com 500 casos; virtualizar só se necessário. Carregar telas pesadas por rota; não carregar bibliotecas de gráfico no atendimento se não usadas. Seletores focados evitam rerender global. `Intl.NumberFormat` e `Intl.DateTimeFormat` centralizados. Não adicionar memoização indiscriminada.

Recursos visuais e marca locais; nenhuma fonte, API ou imagem remota obrigatória na demo. Usar fontes com licença disponível e fallback estável. Um lockfile, um gerenciador de pacotes e scripts previsíveis: dev, build, preview, lint, typecheck, test e test:e2e. Sem `any` para contornar contrato e sem efeitos usados para duplicar estado derivável.
