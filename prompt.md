# Construir o Continua — Hackathon Grupo Anchieta

Você está no repositório `victorpansonato-design/nao-formacao`. Atue como responsável por produto e engenharia front-end e implemente o sistema descrito neste pacote. O objetivo é um **front-end completo, navegável e funcional**, com acabamento visual de alto nível e demonstração reproduzível. Não pare em plano, wireframe, dashboard isolado ou botões sem efeito.

## Primeiro: entenda o projeto sem inflar o contexto

Leia `AGENTS.md`, `README.md`, `implementation/status.md`, `implementation/roteiro.md` e `docs/00-decisoes.md`. Depois consulte `docs/01-estrategia.md`, `design/direcao-visual.md` e os estudos SVG em `design/assets/`. Carregue os demais documentos somente para a feature em construção. Abra as imagens de referência da tela; links e papéis estão em `design/references/README.md`.

O relato de Victor, sintetizado nos documentos, prevalece sobre anexos antigos. O HTML anterior não é referência visual e sua base não pode ser reutilizada. Use os dados sintéticos deste repositório. Não peça novamente decisões rotineiras já resolvidas; registre hipóteses e avance. Pergunte apenas quando faltar uma decisão material que não possa ser simulada com segurança.

## O que estamos construindo

O Anchieta recebe matrículas em ofertas que às vezes não formam turma. Hoje a decisão chega perto do início das aulas, a equipe negocia sob pressão, o CRM fica desconectado e o acordo pode se perder no ajuste do Lyceum. O Continua organiza antecipação, decisão formal, contato assistido, mudança de curso/turno/unidade, restituição e aprendizado após a campanha.

Três momentos: **antecipar**, **conduzir** e **aprender**. Perfis simulados: diretoria, gestão/CX, consultor, Suporte, Financeiro e admin. Origens presencial e semipresencial; EAD fica fora do MVP conforme decisões documentadas. Aulas informadas para 02/02/2027. Banca em 27/11/2026; datas futuras na demo são explicitamente simuladas.

## Escolha técnica e estrutura

Adote TypeScript strict, React estável e Vite. Estilo com Tailwind e tokens CSS. Primitivas acessíveis shadcn/ui com uma base consistente, React Router, Zustand com persistência versionada, Zod, TanStack Table, Recharts, Motion for React e Lucide. Confirme versões/documentação e registre um único lockfile. Se houver incompatibilidade real, resolva e registre a mudança; não misture APIs de versões.

Siga `docs/11-arquitetura.md`: app/shell, features, domínio, contratos e serviços locais, shared UI/motion/format e testes. Políticas, cálculos e transições são funções de domínio; componentes apresentam dados e disparam comandos. Não centralize aplicação em um App.tsx gigante, não espalhe descontos/cores pelo JSX e não crie uma arquitetura de backend fictícia.

## Regras de produto obrigatórias

1. Oferta = curso + modalidade + unidade/polo + turno/agenda + entrada. Nunca agregar decisões de manhã/noite ou polos diferentes por nome do curso.
2. Separar projeção de matrículas, sustentabilidade econômica e decisão da diretoria. A demo usa tendência/cenários; não exiba probabilidade inventada nem diga que existe modelo treinado.
3. Apenas oferta formalmente confirmada, com vaga, agenda e condições válidas pode virar proposta. Risco baixo não é confirmação. Destino suspenso bloqueia aceite, inclusive em proposta já aberta.
4. CRM fornece evidências com trecho/data. Interesse explícito e atual do aluno pode superar afinidade genérica. A personagem Marina considerou Administração e Biomedicina; verificar se o interesse continua válido.
5. Copiloto sugere resumo, pergunta, resposta e ramificações hipotéticas. Identifique “Modo simulado”; não finja chamar um LLM. Use o contrato e os exemplos de `docs/06-copiloto.md`. Nenhuma mensagem sai para terceiros.
6. Pedido direto de restituição não exige negociação. Registre saída e acompanhe regularização/financeiro.
7. Fila geral com “Atender próximo”, prioridade operacional, posse e continuidade. Sem escolher por ticket/comissão. Simule conflito, deixando claro que concorrência real exige servidor.
8. Concessão depende de política/alçada/versionamento. Proposta mostra preço por período, prazo do benefício, valor posterior e custo da concessão. Sem promessa não aprovada.
9. Aceite cria tarefa do Suporte. Apenas execução conferida conta como efetivação. Painel, caso e tarefa refletem o mesmo estado.
10. Devolução tem saldo, duplicidade, trilha e comprovante demonstrativo. Nenhum pagamento real ou documento bancário autêntico.
11. Encerramento da campanha mantém pendências, snapshot e aprendizado. D+7/D+30 dependem de observação; não inventar permanência.
12. Valores em centavos, relógio injetável, IDs sintéticos, ações idempotentes e conflitos explícitos. Nenhum dado pessoal real no código ou navegador.

## Design e motion

Preserve a essência Grupo Anchieta: azul `#0051A0`, navegação `#133A9E` e marca local sem distorção. Tema claro inicial, dark navy completo, contraste legível, tipografia disciplinada e densidade confortável. Os estudos SVG mostram radar e atendimento; são direção, não imagem para colocar como tela.

Referências obrigatórias por propósito: Intercom para workbench de conversa/copiloto, Attio para registros/tabelas, Linear para densidade/hierarquia. Pinterest é guia estético complementar com limitação de acesso registrada. O conceito Behance não deve virar prova de UX. Não copie marca de outro produto nem empilhe componentes diferentes só por serem bonitos.

Siga `design/motion.md`: transições de presença/layout, abas, expansão de fontes, estados de formulário, números e gráficos discretos. Troca de tema com preenchimento circular a partir do botão via View Transitions, detecção e fallback. Respeite movimento reduzido. Não usar animação para atrasar ação, confete, teleporte, shimmer contínuo ou digitação artificial. Foco e scroll devem permanecer coerentes.

## Entregue todas as rotas e ações descritas

`docs/09-telas.md` é a lista de telas e contratos de cada controle: busca, filtro, detalhe, radar, decisão, fila, contato, copiloto, comparação, proposta, aprovação, aceite, retorno, Suporte, devolução, comprovante, réguas, exportação, importação, tema, perfil, campanha e reset. Nada pode terminar em `alert`, toast genérico ou “em breve” como substituto de funcionalidade.

Persistir mudanças entre recarregamentos; implementar CSV/JSON com validação e prévia, exportação real de arquivos, clipboard com fallback, relógio da demo e cenários reproduzíveis. Usar seletores para indicadores e filtros de listas. Ajudas e limites aparecem em texto claro, sem linguagem de implementação nas tarefas do usuário.

## Sequência de execução

Siga `implementation/roteiro.md`. Primeiro entregue a fatia radar → decisão → atendimento → proposta → Suporte → efetivação. Depois complete devolução, aprovação, comunicação, resultados e fechamento. Termine com polish, motion, responsividade e QA. Não use a sequência para abandonar o restante: a entrega pedida é o conjunto funcional completo.

Ferramentas/skills recomendadas estão em `research/ferramentas.md`. Use somente as relevantes e disponíveis; não instalar automaticamente orquestradores, hooks ou plugins. Mantenha checkpoints curtos em `implementation/status.md` para continuar após compactação.

## Validação e conclusão

Implemente verificações significativas dos cenários de `docs/12-qualidade.md` e `data/scenarios.json`. Rode typecheck, lint, build e testes críticos. Execute os percursos de continuidade e devolução com cada papel. Inspecione telas reais em 1440, 1280, 768 e 390 px, claro/escuro, teclado e movimento reduzido. Corrija falhas antes de concluir.

Inicie o servidor local e entregue URL, comandos, resumo do que funciona, evidências e limitações materiais. Não publique, envie mensagens, use APIs pagas, altere Lyceum ou realize pagamentos. Não declare resultado do piloto nem IA real em execução sem evidência. Entregue a aplicação local pronta para a equipe testar e apresentar.
