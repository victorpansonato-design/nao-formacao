# Instruções do projeto Continua

Front-end de demonstração do Hackathon Grupo Anchieta, construído a partir de `prompt.md`. Os documentos são especificação; resultados só valem quando registrados em `implementation/status.md`. Mudança de produto de 12/11/2026 em `docs/00-decisoes.md` (seção final).

## Leitura econômica

Início: README (tem o mapa da documentação), este arquivo, `implementation/status.md` e roteiro. Para cada entrega, ler apenas domínio, referência e testes pertinentes. Não despejar `data/seed.json` ou todas as fontes no contexto. Atualizar status ao terminar uma fatia funcional.

## Contratos permanentes

- Front-end funcional em português, sem integrações reais ou chaves de API.
- Usar TypeScript strict, módulos por feature, tokens centrais e comandos de domínio.
- Perfis: **Diretoria/Gestão** (role `manager`), Consultor, Suporte, Admin técnico. Não existem perfis separados de Diretoria, Gestão ou Financeiro. Permissões em `src/domain/access.ts`; tabela em `docs/08-acessos-fila.md`.
- Turma = curso + modalidade + turno (`Offering`). A Diretoria/Gestão só cadastra **Ofertado: Sim ou Não** por turma; não há análise, aprovação, parecer, suspensão ou investimento estratégico. Toda turma começa Ofertada. Não ofertado envia os matriculados à fila dos consultores, com prévia do impacto antes de salvar. Projeção e economia são apoio, não decisão.
- Somente turma de destino ofertada, válida, com vaga e compatível libera proposta.
- **Virado** = troca para outra turma ofertada feita no Lyceum e confirmada (`confirmTransfer` pelo consultor/Diretoria-Gestão, ou checklist do Suporte). Aceite não conta como efetivação.
- Devoluções acontecem em outro sistema. Aqui só se registra o pedido ("Encaminhada ao financeiro") e a regularização no Suporte. Pedido explícito de devolução segue diretamente; não exigir negociação.
- Desconto: consultor até 5%; até 20% com aprovação da Diretoria/Gestão; acima disso não há política. Valores em `policies`, não no JSX.
- Interesse de CRM precisa de fonte e confirmação atual. Não inventar intenção, dado acadêmico, salário ou empregabilidade.
- Não usar atributo protegido, saúde, vulnerabilidade ou persuasibilidade em fila, preço ou recomendação.
- Dinheiro em centavos, relógio injetável, persistência versionada (esquema atual 4), idempotência e conflito explícito.
- Toda ação visível deve funcionar. Toast sem efeito não substitui operação.
- UI de papéis/leases é simulação; não alegar segurança ou concorrência de servidor.
- Catálogo real (nome, diploma, formato, turno, selo "Novo") vem do site público e fica em `src/data/catalog.ts`, gerado por `python scripts/fetch_catalog.py`; não editar à mão (`docs/15-catalogo-real.md`). Vagas, mensalidades, matrículas e alunos são sintéticos e identificados assim. Fatos públicos podem ficar no repositório; anexos internos e dados pessoais reais, não.
- Todo dado futuro ou sintético deve ser identificado. Não fabricar resultados de piloto ou previsão.

## Painel da Diretoria/Gestão

Regras em `docs/16-painel-diretoria-gestao.md`. Números só de `leadershipPanel` (`src/domain/panel.ts`); afetados particionados (fatias somam o total; contatados + a contatar = afetados). Sem rolagem vertical no desktop a partir de 1280×660. Reutilizar `OfferSwitch`, `CatalogDialog`, `buildCatalog`, `ConfirmTransfer`, `CountUp` e `Donut`; não recriar em outra tela.

## Design

Seguir `design/direcao-visual.md`, `design/tokens.css`, `design/motion.md` e o estudo SVG correspondente. Abrir referências reais relevantes antes de desenhar. Preservar marca e azul Anchieta; não herdar o HTML antigo.

## Movimento

Ler `design/motion.md` antes de criar ou alterar tela, componente ou interação; ele é regra, não sugestão. Resumo do que não se negocia:

- Nada aparece, some ou muda de lugar em um quadro. Toda entrada tem saída.
- Usar o que já existe: classes `motion-*` (`src/app/styles.css`), primitivas de `src/shared/ui/overlays.tsx`, `Reveal`/`Swap` e variantes de `src/shared/motion`. Não criar animação avulsa em feature.
- Duração e curva só pelos tokens de `design/tokens.css`. Animar apenas `opacity`, `transform`, `scale`, `translate`, `filter`. Nunca `transition: all`.
- Bloco condicional no meio do fluxo usa `<Reveal>`; painel de aba e rota usam `motion-enter`.
- Movimento reduzido tem precedência. Estado real vem antes da animação.
- Componente compartilhado novo entra no catálogo de `design/motion.md` na mesma entrega.

## Ambiente

No Windows, iniciar Vite/Vitest a partir de `C:\...` com letra maiúscula; com `c:` minúsculo o React é carregado duplicado e a tela fica em branco. Porta 5173 ocupada nesta máquina.

## Implementação e qualidade

Políticas ficam em configuração/domínio, não em textos JSX. Métricas derivam das mesmas entidades e filtros das listas. Sem `any` de conveniência, estado duplicado, componentes monolíticos ou abstração especulativa. Escolher versões estáveis compatíveis, registrar lockfile e não instalar ferramentas remotas sem necessidade.

Verificar os percursos de continuidade e devolução, cadastro Ofertado/Não ofertado, bloqueios de destino, alçada e o painel. Executar typecheck, lint, build e testes críticos; inspecionar UI em claro/escuro, teclado e mobile; conferir abrir/fechar/reabrir e cliques repetidos conforme `design/motion.md` §10. Registrar evidências reais. Não afirmar que um teste rodou quando ele só está planejado.

Fazer commits focados. Preservar mudanças alheias e não publicar/deployar automaticamente. A autorização de implementação virá da tarefa do usuário; `prompt.md` autoriza a construção local, não pagamentos, mensagens ou alterações no Lyceum.
