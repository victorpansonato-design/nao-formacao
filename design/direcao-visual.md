# Direção visual: clareza que transmite cuidado

## Revisão de 13/11/2026 — identidade do "Controle de Atas"

O usuário enviou como referência vinculante o sistema interno "Controle de Atas" do Grupo Anchieta: `design/references/Controle de Atas — Grupo Anchieta - Brave 2026-11-13 10-14-26.mp4` (16,5 s) e um print da tela "Atas de NDE e Colegiado". Pedido: copiar o funcionamento da barra lateral, o hover limpo, o aplicativo sobreposto com cantos arredondados, as cores dos números e as linhas amarelas, mantendo as regras de movimento do Continua.

Observado no vídeo, quadro a quadro: hover acende uma pílula branca por fade, sem deslizar; o ativo é a mesma pílula, texto mais escuro; o botão no topo recolhe a navegação para um trilho de ícones em cerca de 200 ms, com os rótulos cortados e a marca reduzida; o tema troca com revelação circular a partir do botão no rodapé; a troca de tela não move a navegação.

Cores medidas no print (pixel dominante por região): fundo `#f4f5f7`, painel `#ffffff`, barra superior `#fbfbfc`, borda `#e1e3e6`, tinta `#0b0f18`, texto secundário `#646974`, rótulos `#4c515a`, caixa vazia `#f2f3f6`; números verde `#26894c`, vermelho `#db2c2b`, azul `#133a9e`; linha `#f3bb13`; legendas `#def8e4`, `#ffede9`, `#e9f0ff`. Escuro (vídeo): fundo `#090a0f`, painel `#0e1216`, borda `#1d2125`.

Aplicação e decisões em [DESIGN.md](../DESIGN.md) e `design/tokens.css`. Contraste conferido por cálculo WCAG: o verde exato da referência dá 4,41:1 sobre branco, então fica nos números grandes; texto pequeno de estado usa `#1f7a44` (5,35:1), `#cc2a29` (5,34:1) e `#9a5a00`. Amarelo continua fora de texto. A revisão de 11/11 abaixo é histórico.

## Revisão de 11/11/2026

O usuário solicitou simplificação dos fluxos e depois enviou uma referência cromática vinculante. A direção vigente está em [DESIGN.md](../DESIGN.md): navegação carvão, superfícies brancas e cinza frio, azul claro e etiquetas de estado suaves; escuro derivado da mesma paleta. A proposta anterior de branco quente foi rejeitada. Permanecem a próxima ação por perfil e a informação complementar sob demanda. Os tokens foram atualizados. As propostas abaixo e os SVGs são histórico, não obrigação de reproduzir a barra lateral azul ou a densidade anterior.

## A personalidade do Continua

Institucional, humano, preciso e contemporâneo. O azul Anchieta é o ponto de reconhecimento; a organização do trabalho produz o impacto visual. A tela deve permitir entender em poucos segundos: **qual oferta exige decisão, qual aluno precisa de atenção e qual ação conclui o próximo passo**.

Referências têm papéis definidos em `references/README.md`. Os SVGs em `assets/` são estudos autorais de composição para esta proposta, com dados sintéticos; não são screenshots do aplicativo pronto. Usar como direção de hierarquia e conteúdo, adaptando responsividade e componentes reais.

## Assinatura visual

- Sidebar em azul institucional, com marca original discreta e nome Continua em tipografia de interface.
- Uma **linha de continuidade** nas telas de pessoa/proposta: origem → escolha → ajuste → início. Ela informa estágio e pendências, sem celebrar uma conversão antes da execução.
- Radar com curva observada e cenário futuro claramente diferentes. Uma marca vertical identifica a data de decisão; o foco visual é a lacuna de planejamento.
- No atendimento, o histórico do aluno é legível e a IA é uma camada de ajuda identificada, com fontes. Não usar mascote, esfera brilhante ou partículas para representar inteligência.

## Paleta proposta

Base institucional conhecida: azul `#0051A0`, azul de navegação `#133A9E`. A marca enviada deve ser preservada em proporção, sem redesenho ou filtros. Validar aplicação com a identidade oficial caso haja manual mais recente.

| Papel | Claro | Escuro |
|---|---|---|
| Fundo | `#F4F7FB` | `#0C1626` |
| Superfície | `#FFFFFF` | `#132137` |
| Superfície elevada | `#FFFFFF` | `#192B45` |
| Texto principal | `#14263F` | `#EDF3FC` |
| Texto secundário | `#52647C` | `#A9B9D0` |
| Borda | `#DCE5F0` | `#2C405B` |
| Ação principal | `#0051A0` | `#80B8FF` com texto `#0C1626` |
| Navegação | `#133A9E` | `#102F70` |
| Sucesso | `#146C43` | `#71D6A1` |
| Atenção | `#815200` | `#F2CB71` |
| Erro/risco | `#B42332` | `#FF9CA6` |

Tons suaves de estado ficam no fundo de badges, nunca substituem o texto e o ícone. Amarelo é atenção/ênfase funcional; não transformar o produto em identidade EAD. Não usar vermelho para o próprio aluno ou para quem optou por devolução.

## Tipografia e ritmo

Uma família sans legível: **Inter Variable**, com arquivo local/licença na implementação; fallback `system-ui`. Hierarquia proposta: título de página 28/34 semibold; seção 18/26 semibold; corpo e controles 14/21; dados auxiliares 12/18; métricas 30/36 com números tabulares. Evitar textos menores que 12 px. Labels em sentence case, sem excesso de caixa alta.

Escala de espaçamento 4, 8, 12, 16, 24, 32, 40. Página com 32 px em desktop, 16–24 em mobile. Linhas de tabela 48–56 px; modo compacto opcional de 40 px. Botões 40 px em desktop e alvos confortáveis de 44 px em mobile. Bordas de 1 px; raio 8 em controles, 12 em painéis, 16 em diálogo; evitar transformar tudo em cápsula.

## Composição

Dashboard organiza uma pergunta por área. Métricas compactas acima de um painel principal largo; diagnóstico/pendências em coluna lateral. Tabelas ficam visualmente abertas, com divisórias discretas, não uma caixa arredondada em cada linha. Não preencher espaço com donuts quando uma barra ordenada responde melhor.

O atendimento concentra o destaque na conversa e na sugestão contextual. Cartões de opções mostram a diferença decisiva antes do botão. Ação principal fica em posição previsível; ações destrutivas/irreversíveis de demonstração abrem confirmação com impacto.

## Critique o desenho antes de expandir

Perguntas para a primeira implementação: o radar explica projeção versus decisão sem tooltip? O caso mostra o que o aluno disse e quando? A turma confirmada fica inequívoca? A oferta evidencia o preço depois do desconto? Um coordenador entende o repasse sem treinamento? Se não, melhorar estrutura e texto antes de adicionar efeitos.

## Conteúdo de interface

Usar “Continuidade efetivada”, “Aguardando ajuste”, “Pediu devolução”, “Turma confirmada” e “Dados insuficientes”. Evitar “Aluno perdido”, “Salvo”, “Capturado”, “Fechado com sucesso” em caso ainda operacional e “IA decidiu”. Toda simulação tem marca discreta persistente e explicação no lugar de maior consequência.

## Restrições visuais deliberadas

Sem gradiente roxo genérico, brilho contínuo, cards saltando, fundo animado em tela operacional, confete, animação de digitação artificial ou imagem de campus para ocupar painel vazio. Azul, proporção, contraste, conteúdo e motion de resposta são suficientes para um resultado marcante.
