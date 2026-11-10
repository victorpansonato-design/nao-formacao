# Instruções do projeto Continua

Este repositório começa como planejamento do Hackathon Grupo Anchieta. A aplicação será implementada a partir de `prompt.md`. Não confundir documentação pronta com app pronto.

## Leitura econômica

Início: README, este arquivo, `implementation/status.md` e roteiro. Para cada entrega, ler apenas domínio, referência e testes pertinentes. Não despejar `data/seed.json` ou todas as fontes no contexto. Atualizar status ao terminar uma fatia funcional.

## Contratos permanentes

- Front-end funcional em português, sem integrações reais ou chaves de API.
- Usar TypeScript strict, módulos por feature, tokens centrais e comandos de domínio.
- Ofertas têm curso/modalidade/unidade/agenda/entrada. Risco, economia e decisão são campos distintos.
- Somente destino confirmado, válido, com vaga e compatível libera proposta.
- Interesse de CRM precisa de fonte e confirmação atual. Não inventar intenção, dado acadêmico, salário ou empregabilidade.
- Não usar atributo protegido, saúde, vulnerabilidade ou persuasibilidade em fila, preço ou recomendação.
- Pedido explícito de devolução segue diretamente; não exigir negociação.
- Alçada e política controlam concessões. Aceite não conta como efetivação.
- Dinheiro em centavos, relógio injetável, persistência versionada, idempotência e conflito explícito.
- Toda ação visível deve funcionar. Toast sem efeito não substitui operação.
- UI de papéis/leases é simulação; não alegar segurança ou concorrência de servidor.
- Base sintética apenas. Anexos internos e dados reais não vão para este repositório público.
- Todo dado futuro ou sintético deve ser identificado. Não fabricar resultados de piloto ou previsão.

## Design

Seguir `design/direcao-visual.md`, `design/tokens.css`, `design/motion.md` e o estudo SVG correspondente. Abrir referências reais relevantes antes de desenhar. Preservar marca e azul Anchieta; não herdar o HTML antigo. Motion deve preservar orientação, foco e desempenho; movimento reduzido tem precedência.

## Implementação e qualidade

Políticas ficam em configuração/domínio, não em textos JSX. Métricas derivam das mesmas entidades e filtros das listas. Sem `any` de conveniência, estado duplicado, componentes monolíticos ou abstração especulativa. Escolher versões estáveis compatíveis, registrar lockfile e não instalar ferramentas remotas sem necessidade.

Verificar os percursos de continuidade e devolução, bloqueios de destino, alçada e saldo. Executar typecheck, lint, build e testes críticos; inspecionar UI em claro/escuro, teclado e mobile. Registrar evidências reais. Não afirmar que um teste rodou quando ele só está planejado.

Fazer commits focados. Preservar mudanças alheias e não publicar/deployar automaticamente. A autorização de implementação virá da tarefa do usuário; `prompt.md` autoriza a construção local, não pagamentos, mensagens ou alterações no Lyceum.
