# Continua — trabalho em primeiro plano

Revisão de 11/11/2026, motivada pela avaliação do usuário: reduzir ruído, textos e escolhas simultâneas. Substitui a aplicação anterior da paleta sem alterar os contratos de produto.

## Direção

Revisão de 13/11/2026: referência vinculante enviada pelo usuário, o sistema "Controle de Atas" do Grupo Anchieta (print e vídeo em `design/references/`). Substitui a navegação carvão e o azul claro de 11/11/2026. Cores medidas por pixel; detalhes em `design/direcao-visual.md`.

- **Estrutura:** a navegação é o fundo da aplicação (`#f4f5f7`; escuro `#090a0f`), sem borda. O conteúdo flutua sobre ela num painel branco com cantos de 16 px e margem de 10 px (`Shell.tsx`). A barra superior fica dentro do painel: botão de recolher num compartimento com divisor vertical, nome do produto, busca, avisos e o perfil à direita (nome, papel em selo, iniciais).
- **Navegação:** itens de 36 px, texto `#4c515a`; hover e ativo são a mesma pílula branca. Recolhe para um trilho de ícones de 64 px com a marca reduzida. Tema escuro/claro no rodapé.
- **Cor:** tinta `#0b0f18`; azul `#133a9e` em ações e seleção, com texto branco; bordas `#e1e3e6`. Números de indicador nas cores exatas da referência: verde `#26894c` (concluído), vermelho `#db2c2b` (pendente), azul `#133a9e` (total). Texto pequeno de estado usa um passo mais profundo do mesmo matiz para 4,5:1. Escuro: painel `#0e1216`, bordas `#1f242a`, azul `#8aa6f0` com texto escuro.
- **Pitada de sal:** linha amarela `#f3bb13` de 48 × 2 px sob o título de cada tela (`PageHeader`), no painel da gestão e no cartão de próxima ação. É assinatura; nunca indica estado nem substitui texto.
- **Superfícies:** cartões brancos com borda de 1 px e raio de 16 px, sem sombra marcada; caixas de aviso em `#f2f3f6`. Filtro segmentado em contêiner com borda e opção ativa em azul sólido. Próxima ação (`WorkCue`) em azul com botão claro.

Uma família Inter local. Título 28/36, seção 14/22, corpo 14/21, apoio 12–13. Tabelas abertas, separadores discretos.

## Hierarquia de trabalho

- Entrada: pendência pertinente ao perfil, uma ação concreta, resumo curto e lista de trabalho. Exceção desde 12/11/2026: a Diretoria/Gestão entra no Painel, que cabe na tela do desktop sem rolar (`docs/16-painel-diretoria-gestao.md`).
- Ofertado: controle Sim/Não por turno (`OfferSwitch`), o mesmo no painel, no pop-up do catálogo e no detalhe da turma. Listas de turmas separadas por modalidade, uma linha por curso.
- Navegação: duas ou três áreas de uso frequente por perfil; demais rotas em **Outras áreas**. Ajuda e ferramentas separadas do trabalho diário.
- Atendimento: conversa principal; preparação, alternativas e copiloto em abas. Dados completos e histórico em gaveta. Devolução sempre diretamente acessível.
- Listas: busca visível, filtros sob um controle explícito. Detalhes analíticos e referências na tela do registro.
- Relatórios: números e denominadores visíveis; definições e amostras acessíveis em seção própria.
- Configurações: campanha, política, importação e preferências em áreas distintas.

## Informação sob demanda

Descrição de tela e seção por botão de informação nomeado. Histórico, catálogo e detalhes complementares por expansão explícita. Não recolher erros, bloqueios, condições financeiras necessárias para aceite, saldo, consequências da confirmação ou acesso ao pedido de saída.

## Referências inspecionadas

[Linear — My issues](https://linear.app/docs/my-issues): foco em trabalho pertinente ao usuário. [Attio — Records](https://attio.com/help/reference/managing-your-data/records/create-and-view-records): separação entre lista e registro. [Intercom Inbox](https://www.intercom.com/helpdesk/inbox): conversa como região principal e ferramentas contextuais. Imagens reais locais em `design/references/` foram abertas; não se reutilizam marcas ou conteúdo desses produtos.

## Movimento

Toda mudança visível é contínua: tem origem, percurso e destino. Regras, tokens, arsenal e catálogo em `design/motion.md`; leitura obrigatória antes de qualquer alteração de interface.

## Fonte de verdade

Cores, dimensões, durações e curvas em `design/tokens.css`; complementos e classes `motion-*` em `src/app/styles.css`. Regras continuam no domínio. Nenhum indicador é mantido manualmente. Sem fontes, dependências ou serviços novos.
