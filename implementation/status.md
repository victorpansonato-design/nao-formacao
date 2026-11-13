# Checkpoint

## 13/11/2026 — Preparação da publicação autorizada

- **Pedido:** enviar as alterações ao GitHub e publicar a demonstração na Vercel.
- **Configuração:** `vercel.json` com build Vite e fallback para `index.html`, preservando o acesso direto às rotas. Projeto `anchieta-continua` na equipe `victor-capitani`. Vídeo interno de referência e pasta `.vercel` ignorados no Git.
- **Verificação executada nesta publicação:** typecheck, lint e build aprovados; testes de domínio **78/78**; testes de navegador **24/24** (Chrome, aproximadamente 2 minutos, incluindo claro/escuro, mobile, teclado e percursos críticos); `python scripts/validate_planning.py` aprovado. Build mantém o aviso conhecido de chunk principal acima de 500 kB.
- **Publicação concluída:** commit de aplicação `13d40d9` enviado para `origin/feat/continua-app`; Vercel **READY**, produção, deploy `dpl_2zdBQwSFdJvvhy9EuSxRPxYMyV85`, build remoto em aproximadamente 82 segundos. Endereço: https://anchieta-continua.vercel.app. A integração Git publicou esse commit; a solicitação manual duplicada foi cancelada.
- **Verificação remota:** acesso direto a `/visao-geral` e `/atendimentos` com HTTP 200, sem autenticação exigida. Smoke no Chrome headless carregou o Painel e seus indicadores, sem erros JavaScript. Consulta de logs de execução não encontrou erros/fatais na janela de 10 minutos; não há drains configurados (aplicação estática). Somente demonstração com dados sintéticos, sem integração real. Esta entrada documenta o deploy do commit de aplicação acima.

> **Histórico: o que mudou depois.** As entradas abaixo da primeira descrevem o produto antes de 12/11/2026. Seis perfis (com Financeiro), decisão de formação com parecer/estados, devolução com pagamento simulado e comprovante, e abertura no cenário Antecipação **não valem mais**. Regras atuais em `AGENTS.md` e `docs/00-decisoes.md`.

## 13/11/2026 — Copiloto guiado no atendimento

- **Pedido (usuário):** o atendimento estava confuso (abas Preparação/Alternativas/Copiloto, seletor de contexto, seletor de tipo de registro, formulário com "fonte da confirmação"); com 400 alunos o consultor se perderia registrando. Pediu um copiloto com ícone de robô: abertura pronta, três respostas prováveis do aluno + uma para escrever/colar, resposta seguinte já no campo de envio.
- **Feito:** motor `src/domain/assistant.ts` (leitura do assunto e dos dados da mensagem, próxima pergunta pela primeira confirmação pendente, três respostas prováveis, ações sugeridas, retorno às 10h). Comando atômico `recordStudentReply` (`commands/cases.ts`) registra a resposta e o que ela confirma, com a mensagem como fonte. Tela do atendimento em duas regiões: `ConversationPanel` (balões; campo já preenchido com a sugestão; "Copiar e registrar envio"; "Outro registro" para ligação/nota) e `CopilotPanel` (robô, opções, colar/escrever com prévia e caixas de seleção, correção do assunto, ações: proposta, devolução, aceite, retorno, manifestação, próximo aluno). Preparação manual foi para a gaveta "Dados do aluno"; alternativas completas, para gaveta própria. `RefundDialog` extraído de `CaseOperations` e reutilizado.
- **Decisões de implementação (a confirmar):** opção escolhida é registrada como resumo em terceira pessoa ("Pediu a devolução do que pagou."), não como citação; dados lidos de mensagem colada são gravados só com a caixa marcada; leitura por regras locais, sem modelo de linguagem, e sem inferência emocional (`docs/06-copiloto.md`).
- **Verificação:** executado em 13/11/2026 a partir de `C:epos
ao-formacao
ao-formacao`: `npm run typecheck` e `npm run lint` sem erros; `npm test` **78/78** (7 novos em `assistant.test.ts`, incluindo o ciclo da Marina só com cliques até a proposta); `npm run build` aprovado (aviso conhecido de chunk); `npm run test:e2e` **24/24** (fluxo da Marina e testes de rascunho/mobile reescritos para o copiloto). Verificação à parte sem movimento reduzido: clique duplo em "Copiar e registrar envio" grava uma mensagem; troca de etapa do copiloto anima com fade; abrir/fechar "Registrar nova mensagem" três vezes termina coerente; nenhum erro de console. Capturas claro/escuro/390 px em `implementation/evidence/copiloto/`.
- **Limites:** só Chrome; sem teste com consultores; leitura por palavras-chave erra frases ambíguas (o consultor corrige o assunto); a cópia para a área de transferência depende de permissão do navegador.

## 13/11/2026 — Identidade do "Controle de Atas"

- **Pedido (usuário):** clonar a identidade visual do sistema interno "Controle de Atas" do Grupo Anchieta (vídeo e print em `design/references/`): navegação como fundo, aplicativo sobreposto com cantos arredondados, hover limpo, recolher para trilho, cores dos números e linhas amarelas, mantendo as regras de movimento.
- **Análise:** quadros extraídos do vídeo com ffmpeg (hover, recolher, troca de tela, tema); cores medidas por pixel no print e no vídeo. Detalhes em `design/direcao-visual.md` (revisão de 13/11) e `DESIGN.md`.
- **Feito:** tokens novos em `design/tokens.css` e `src/app/styles.css` (claro e escuro; `--accent`, `--kpi-*`, `--surface-bar`, `--radius-shell`). `Shell.tsx`: navegação como fundo e conteúdo num painel arredondado. `Sidebar.tsx`: marca grande, pílula clara no hover e no ativo, recolher para trilho de 64 px com dicas e ponto de pendência, tema no rodapé. `Topbar.tsx`: botão de recolher com divisor, nome do produto, perfil à direita com o menu "Ver como". `PageHeader` com linha amarela e divisor; `Panel`/`Disclosure` com borda; `Stat` como cartão de número colorido; filtro segmentado em azul sólido; `WorkCue` em azul com botão `inverse`; números do painel em azul/vermelho/verde. `Tooltip` ganhou `disabled`.
- **Defeito corrigido na verificação:** com o `Tooltip` envolvendo o `NavLink`, o Slot do Radix transformava o `className` em função num texto; o link perdia `relative` e o fundo ativo cobria a tela inteira, bloqueando cliques. Ativo agora vem de `useMatch`. Removido o `scrollbar-gutter` do `html` (a página não rola; sobrava uma faixa à direita do painel).
- **Verificação:** executado em 13/11/2026 a partir de `C:
epos
ao-formacao
ao-formacao`: `npm run typecheck` e `npm run lint` sem erros; `npm test` **71/71**; `npm run build` aprovado (aviso já conhecido de chunk grande); `npm run test:e2e` **24/24** (2,2 min, Chrome). Painel sem rolagem em 1440×900 (823 = 823) e 1280×660 (583 = 583). Com movimento ligado: largura da navegação passa por valores intermediários ao recolher; três cliques rápidos terminam em estado coerente; preferência persiste após recarregar; tema troca com círculo a partir do rodapé e o foco fica no botão; nenhum erro de console. Contraste calculado (WCAG) para os pares novos. Capturas em `implementation/evidence/identidade-atas/`.
- **Limites:** só Chrome; sem teste com usuários; a largura da navegação anima por `width` (exceção declarada em `design/motion.md`), o que refaz o layout do conteúdo durante 200 ms. Capturas antigas em `evidence/` mostram a identidade anterior.

## 12/11/2026 — Perfil Diretoria/Gestão, oferta Sim/Não, painel e catálogo real

- **Pedido (dona do produto):** unir Diretoria e Gestão em um perfil e remover o Financeiro; trocar a análise de formação por um cadastro Ofertado Sim/Não por curso + modalidade + turno; levar os alunos das turmas não ofertadas direto à fila; abrir a Diretoria/Gestão em um painel sem rolagem; usar o catálogo real do site; devoluções só registradas.
- **Feito:** perfis Diretoria/Gestão, Consultor, Suporte, Admin (`src/domain/access.ts`). `DecisionOutcome` binário; `recordDecision` com prévia (`previewDecision`), fila, volta a Ofertado e congelamento de propostas (`commands/offerings.ts`). Painel em `/visao-geral` (`src/features/dashboard/`), números de `leadershipPanel` (`src/domain/panel.ts`), `CountUp` e `Donut` (`src/shared/motion/data.tsx`). `OfferSwitch` e `CatalogDialog` (pop-up quase em tela cheia, Todos/Ofertados/Não ofertados); mesmos botões na aba Ofertas (`?decisao=`). `confirmTransfer` com botão "Confirmar troca realizada no Lyceum" no atendimento e na proposta. Devoluções com status único "Encaminhada ao financeiro", sem conferência, pagamento ou comprovante. Catálogo real (82 cursos, 149 turmas, 30 "Novo") em `src/data/catalog.ts`, gerado por `scripts/fetch_catalog.py`. Cenário `progress` (Em andamento) como abertura; `SCHEMA_VERSION` 4.
- **Decisões:** registradas em `docs/00-decisoes.md` (D1–D14). De implementação, pendentes de confirmação: alçada única 5%/20%, cenário Em andamento como abertura, consultores veem todos os pedidos de devolução, vagas/mensalidade fictícias nas turmas só de catálogo, fatos públicos do catálogo no repositório.
- **Documentação:** novos `docs/15-catalogo-real.md` e `docs/16-painel-diretoria-gestao.md`; atualizados `AGENTS.md`, `README.md` (com mapa da documentação), `PRODUCT.md`, `DESIGN.md`, `prompt.md` (instruções substituídas marcadas), `docs/00`–`14` onde estavam errados, nota em `hackathon/banca.md`.
- **Arquivos-chave:** `src/domain/{types,access,panel,labels}.ts`, `src/domain/commands/{offerings,academic,refunds}.ts`, `src/data/{seed,catalog,presets}.ts`, `src/services/store.ts`, `src/features/dashboard/*`, `src/features/offerings/{catalog.ts,OfferSwitch.tsx,CatalogDialog.tsx,OfferingsPage.tsx}`, `src/features/cases/ConfirmTransfer.tsx`.
- **Verificação:** Executado em 13/11/2026, a partir de `C:\repos\nao-formacao\nao-formacao`: `npm run typecheck` e `npm run lint` sem erros; `npm test` **71/71** (6 arquivos); `npm run build` aprovado (aviso já conhecido de chunk grande, ~1,60 MB minificado / 300 kB gzip); `npm run test:e2e` **24/24** no Chrome (2,3 min; uma rodada com `--repeat-each=2` deu 48/48); `python scripts/validate_planning.py` OK. Painel sem rolagem vertical medido em 1440×900, 1366×768 e 1280×720 (`main.scrollHeight = clientHeight`); capturas em claro/escuro e mobile em `implementation/evidence/dashboard/`. Corrigido na verificação: diálogos e gavetas não devolviam o foco ao fechar (`src/shared/ui/overlays.tsx`). Limites: só Chrome; sem teste com usuários; turmas de destino mostram vagas ocupadas sintéticas sem alunos acompanhados por trás, então marcá-las como Não ofertado não gera casos (limite da base sintética). Evidências visuais do painel em `evidence/dashboard/`.
- **Limites:** painel empilha e rola entre 1024 e 1279 px de largura ou abaixo de 660 px de altura; verificado só no Chrome; sem teste com usuários. Site do catálogo muda sem aviso; turno de Semipresencial/Intensivo/EAD é convenção nossa; "Nutrição 360º" corresponde ao cartão "Nutrição".
- **Ambiente:** iniciar Vite/Vitest a partir de `C:\...` (maiúscula); com `c:` o React carrega duplicado e a tela fica em branco. Porta 5173 ocupada.
- **Próximo:** preencher a verificação acima; obter da dona do produto a confirmação das decisões de implementação; revisar capturas antigas em `evidence/` que ainda mostram o perfil Financeiro.

## 12/11/2026 — Movimento contínuo em todas as interações

- **Pedido:** eliminar trocas bruscas e teleportes; registrar regras para qualquer implementação futura.
- **Defeitos encontrados:** diálogo entrava deslocado (keyframe reescrevia `transform` sobre o `translate` do Tailwind 4); press de botão sem transição (`scale` fora da lista); popover, menu, tooltip e busca global sem saída; gaveta deslizava só 24 px; `<details>`, erros inline, painéis de aba e rotas apareciam em um quadro; vários hovers sem transição.
- **Feito:** escala de duração/curva em `design/tokens.css`; classes `motion-*` e transição global de controles em `src/app/styles.css`; `Reveal`, `Swap` e molas em `src/shared/motion`; overlays com entrada e saída, origem no gatilho; indicador deslizante na navegação; entrada de rota e de painel de aba; erro de comando e de campo com altura contínua; avisos em pilha; medidores por `transform`; transições de cor suspensas durante a troca de tema.
- **Decisão:** rotas animam por CSS, não por View Transitions (filtros na URL disparariam crossfade a cada tecla). Motivos e fontes em `design/motion.md`.
- **Documentação:** `design/motion.md` reescrito como regra (tokens, ferramenta por caso, 13 regras, catálogo, receita para feature nova, limites, fontes). `AGENTS.md` ganhou a seção Movimento; `DESIGN.md` aponta para ela.
- **Verificação executada:** typecheck e lint sem erros; domínio **26/26**; build aprovado (aviso de chunk já conhecido); e2e **14/14** (rodam com movimento reduzido). Medição quadro a quadro no Chrome, sem movimento reduzido, de rota, navegação, abas, busca, popover, press, `<details>`, gaveta, medidor e tema: percursos contínuos, nenhum erro de console.
- **Limites:** só Chrome; sem medição de taxa de quadros nem teste com usuários. Pendências listadas em `design/motion.md` §9 (altura de `<details>` fora do Chromium não verificada, avisos condicionais antigos sem `Reveal`, números sem interpolação).

## 11/11/2026 — Logo sem fundo adicional

- Removido o contêiner azul aplicado à marca na sidebar. A imagem original é exibida diretamente, sem fundo, filtro ou moldura adicional.
- Verificado no navegador: fundo computado da imagem transparente; captura em `evidence/logo-sem-fundo.png`. Typecheck, lint e build aprovados.


## 11/11/2026 — Cores alinhadas à referência enviada

- **Correção solicitada:** o usuário rejeitou os tons quentes da revisão anterior e forneceu um dashboard como referência. Claro com fundo cinza frio, painéis brancos e navegação carvão; azul claro `#8bbbea` nas ações, com texto escuro. Escuro derivado da mesma combinação. Marca original preservada.
- **Acabamento:** painéis com raio de 20 px e sombra leve, controles com 10 px, etiquetas de estado suaves; a próxima ação combina carvão e azul. Topbar usa o fundo de conteúdo para manter contraste no claro. Fluxos e organização anterior preservados.
- **Verificação real:** typecheck/lint/build aprovados; domínio **26/26**, navegador **14/14**; detector Impeccable `[]`. Inspeção das quatro entradas nos dois temas: **508 nós de texto**, nenhuma falha de contraste no recorte. Build continua com o aviso já conhecido do chunk principal.
- **Evidências:** [cores-referencia/README.md](evidence/cores-referencia/README.md), capturas reais em claro/escuro/mobile e JSON de contraste. As capturas da rodada anterior foram preservadas separadamente. `PRODUCT.md` e `DESIGN.md` atualizados para a referência do usuário.

---

## 11/11/2026 — Simplificação de UX e novos temas

- **Direção confirmada pelo usuário:** cada perfil deve abrir suas pendências e reconhecer a próxima ação. Produto registrado em `PRODUCT.md`, direção em `DESIGN.md`; a revisão em `design/direcao-visual.md` substitui a aplicação anterior da paleta.
- **Estrutura:** navegação com 2–3 áreas principais por papel, demais rotas em Outras áreas; entrada da gestão/diretoria por pendência; Suporte e Financeiro entram com itens em aberto e atalho para o próximo registro. Consultor mantém a fila pessoal e Atender próximo.
- **Redução de ruído:** branco quente/grafite e azul institucional pontual; estados sem placas coloridas; painéis sem contornos repetidos. Textos explicativos em informação acessível, filtros em popover, históricos em expansões, configurações em abas. Radar reduzido a cinco colunas essenciais; detalhes/exportação preservam os dados completos.
- **Atendimento:** conversa + ferramentas em abas, sugestão inicial no primeiro contato, preparação depois do registro, dados/histórico em gaveta. Rascunho preservado nas abas. Devolução direta permanece no cabeçalho; encaminhamentos secundários em Mais ações. Aceites e saídas exibem seus registros de execução.
- **Verificação executada:** typecheck e lint aprovados; domínio **26/26**; navegador **14/14** (seis papéis, rotas nos dois temas, mobile, teclado, rascunho, continuidade, devolução, decisões, alçadas e importação). Build aprovado; verificador de planejamento aprovado. Detector mecânico Impeccable retornou `[]`.
- **Evidência renderizada:** quatro entradas × dois temas, **508 nós de texto medidos**, nenhuma falha de contraste no recorte; três links principais visíveis nas quatro entradas. Capturas, JSON e limites em [evidence/simplificacao/README.md](evidence/simplificacao/README.md). Não é auditoria WCAG completa nem validação de usabilidade com colaboradores.
- **Pendente conhecido:** bundle principal permanece acima do limite recomendado (aprox. 1,31 MB minificado / 210 kB gzip). Não houve nova dependência, deploy ou mudança nas regras de domínio.

---

## 11/11/2026 — Telas vazias preenchidas e percursos locais verificados

- **Causa:** 13 componentes de rota tinham somente `PageHeader`; não era falha de carregamento da base. As telas já implementadas e as alterações locais existentes foram preservadas.
- **Conteúdo funcional:** visão geral reconciliada com listas; detalhe de oferta com curva, tabela, parecer e decisão; alunos/jornada; atendimento dividido em contexto, conversa, alternativas, copiloto e operações; propostas/aprovações; devolução com conferência, regularização, trilha e comprovante; réguas com prévia/exclusões; políticas, importação JSON com prévia e ciclo de campanha; ajuda e controles de cenário/relógio/perfil.
- **Correções de compatibilidade:** componente da calculadora renomeado para `RevenueCalculator.tsx`, evitando colisão de resolução com `calculator.ts` no Windows; removido filtro tautológico da exportação; tipagem explícita no teste de reconciliação. Indicador de ofertas confirmadas inclui confirmação estratégica na mesma lista filtrada. Verificador do planejamento lê UTF-8 explicitamente e ignora dependências/artefatos; `python scripts/validate_planning.py` aprovado.
- **Verificação final executada:** `npm run typecheck` e `npm run lint` sem erros; `npm test` **26/26**; `npm run build` aprovado; `npm run test:e2e` **11/11**, Chrome, 2 workers, aproximadamente 1 minuto. E2E cobre conteúdo das rotas em claro/escuro, antecipação 500/0, continuidade até efetivação, devolução direta até comprovante, decisão, aprovação, importação idempotente, política, nova campanha, régua, mobile 390 px e salto por teclado.
- **Evidências:** capturas reais e escopo de QA em [evidence/README.md](evidence/README.md). Vite existente na porta 5180 conferido: HTTP 200 servindo o componente atualizado. Não houve deploy, integração externa ou alteração de dados reais.
- **Limites/próximo:** build avisa sobre o bundle principal acima de 500 kB (aprox. 1,42 MB minificado / 244 kB gzip); otimizar carregamento da base sintética antes de distribuição. Validação institucional, piloto com colaboradores, testes em outros navegadores e backend continuam fora desta verificação local.

---

## 11/11/2026 — Entregas 1 e 2 (fundação e domínio) concluídas

- **Stack instalada** (lockfile npm): React 19.3, Vite 8.3, TypeScript 6.0 (o npm resolveu 6.x por compatibilidade com typescript-eslint 8.72), Tailwind 4.3, React Router 8.5, Zustand 5.1 + immer, Zod 4.6, TanStack Table 9.3 (API v9: `useTable` + `tableFeatures`), Recharts 3.10, Motion 14, Lucide 1.72, Radix (`radix-ui`), Vitest 5, Playwright 1.65.
- **Primitivas**: padrão shadcn/ui escrito à mão sobre `radix-ui` em `src/shared/ui/` (uma base só; CLI não executada).
- **Domínio** em `src/domain/`: comandos atômicos e idempotentes (`commands/index.ts → execute`), elegibilidade, projeção, fila, copiloto simulado, indicadores, réguas. Presets em `src/data/presets.ts` são gerados pelos mesmos comandos.
- **Decisão de dados**: a base `data/seed.json` é a fonte; o adaptador `src/data/seed.ts` só acrescenta nomes fictícios legíveis, área/titulação e réguas. Nos presets de operação em diante, todas as 8 origens recebem não formação (500 afetados, como no exemplo do relato).
- **Referência visual adotada**: Intercom Inbox (conversa central, detalhes e copiloto laterais) e Linear (densidade, hierarquia, navegação discreta). O estudo PNG/SVG gerado não foi usado como base de tela.
- **Verificação**: `npx tsc --noEmit` ok; `npx eslint .` ok; `npx vite build` ok; `npx vitest run` 3/3 (presets). Shell conferido em tela real, claro e escuro, sem erro de console.
- **Ambiente Windows**: rodar Vitest a partir de `C:\...` (letra maiúscula); com `c:` minúsculo o Vitest 5 carrega módulos duplicados e falha na inicialização. Porta 5173 ocupada nesta máquina; dev em `npx vite --port 5180`.
- **Próximo**: telas por feature (entregas 3–8), testes T01–T24, e2e, QA visual e evidências.

---

Data: 10/11/2026.

**Concluído:** leitura dos anexos; pesquisa comentada; especificação de negócio/UX/arquitetura; referências; motion; prompt de implementação; plano de piloto e materiais de demonstração sintéticos.

**Não iniciado:** aplicação React; instalação de dependências; testes do front-end; integração real; treinamento/validação preditiva; geração de IA real no piloto; piloto com colaboradores.

**Próxima ação:** executar entrega 1 de `roteiro.md`, preservando os documentos existentes.

**Invariantes:** destino confirmado; decisão humana; interesse com evidência; alçada comercial; saída facultativa; aceite diferente de efetivação; dados sintéticos; métricas sem resultado inventado.

Ao atualizar: registrar entrega, arquivos/decisões, comando e resultado da verificação, falha pendente e próximo passo. Manter curto.
