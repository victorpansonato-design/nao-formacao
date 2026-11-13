# Telas, navegação e ações

## Estrutura global

Produto interno para trabalho intenso em desktop, responsivo para consulta e execução simples em mobile. Sidebar fixa de 232 px, topo com campanha/unidade, busca global, ajuda, tema e perfil de demonstração. Área principal com título, contexto curto e uma ação primária por tarefa. Dados e datas em pt-BR; fuso `America/Sao_Paulo`.

Menu por necessidade: Painel, Ofertas, Atendimentos, Alunos, Propostas, Aprovações, Ajustes acadêmicos, Devoluções, Comunicação, Resultados e Configurações. O perfil determina itens e ações disponíveis (`08-acessos-fila.md`). Não criar 15 itens equivalentes no menu.

## Catálogo de rotas

| Rota | Usuário principal | Conteúdo e ação central |
|---|---|---|
| `/visao-geral` | Diretoria/Gestão | **Painel**: afetados, contatados, virados, situação, equipe e catálogo com Sim/Não; pop-up do catálogo (`16-painel-diretoria-gestao.md`) |
| `/ofertas` | Todos os perfis | Lista de turmas com busca, filtros e botões Todos / Ofertados / Não ofertados (`?decisao=ofertados\|nao-ofertados`); risco e tendência como apoio |
| `/ofertas/:id` | Todos; Sim/Não só Diretoria/Gestão | Tendência, condições, histórico Ofertado/Não ofertado e `OfferSwitch` |
| `/alunos` | Diretoria/Gestão, Consultor | Busca, filtros, casos, responsável e desfecho; `?kpi=…` abre a lista de um número do painel |
| `/alunos/:id` | Equipe autorizada | Jornada, evidências CRM, propostas, tarefas e eventos |
| `/atendimentos` | Consultor | Fila geral, meus retornos e botão Atender próximo |
| `/atendimentos/:id` | Consultor | Conversa, contexto, opções e copiloto; registrar próximo passo; **Confirmar troca realizada no Lyceum** quando aguarda ajuste |
| `/propostas/:id` | Consultor, Diretoria/Gestão | Comparação, condição, aprovação, aceite simulado e confirmação da troca |
| `/aprovacoes` | Diretoria/Gestão | Descontos acima de 5% e até 20%: impacto e decisão |
| `/comunicacao` | Diretoria/Gestão | Réguas, prévia, exclusões e eventos simulados |
| `/ajustes` | Suporte | Fila de execução e checklist por caso |
| `/ajustes/:id` | Suporte | Acordo completo, pendências e confirmação Lyceum simulada |
| `/devolucoes` | Diretoria/Gestão, Consultor, Suporte | Leitura: pedidos registrados, status "Encaminhada ao financeiro", valor estimado |
| `/devolucoes/:id` | Diretoria/Gestão, Consultor, Suporte | Leitura: pedido, valor estimado, regularização no Suporte e trilha. Sem conferência, pagamento ou comprovante |
| `/resultados` | Diretoria/Gestão, Consultor, Suporte | Comercial, operação, experiência, financeiro e continuidade |
| `/configuracoes` | Admin técnico, Diretoria/Gestão | Campanha, políticas, importação e reset |
| `/ajuda` | Todos | Glossário, guia e limites da demonstração |
| `/demo/controle` | Apresentador | Relógio, cenário, falhas simuladas e restaurar base |

## Painel da Diretoria/Gestão

Primeira tela do perfil. Especificação completa em `16-painel-diretoria-gestao.md`. Resumo: cabe na tela do desktop sem rolar (a partir de 1280×660); todo número vem de `leadershipPanel` e abre a lista correspondente em `/alunos?kpi=…`; sem afetados, mostra estado vazio com **Abrir o catálogo**. No cenário Antecipação, afetados = 0 mesmo com 500 matrículas em monitoramento.

## Catálogo e cadastro Ofertado

- Lista separada por modalidade; uma linha por curso; os turnos na mesma linha, cada um com seu Sim/Não (`OfferSwitch`). Todo curso mostra a modalidade real em que existe e o selo "Novo" quando houver.
- Pop-up quase em tela cheia (`CatalogDialog`, aberto pelo painel): busca por curso e botões **Todos / Ofertados / Não ofertados** com contagem.
- Marcar Não ofertado com alunos ou propostas afetados abre confirmação com os números antes de gravar. Sem impacto, grava no clique.
- Perfis sem permissão veem o estado (Ofertado/Não ofertado), sem controle.

## Atendimento: a tela mais importante

Duas regiões: conversa (flexível) e copiloto (380 px, fixo ao rolar). Abaixo de 1024 px, abas Conversa/Copiloto com rascunho preservado. Dados do aluno, interesses e preferências ficam na gaveta "Dados do aluno"; a lista completa de alternativas, em gaveta própria.

Cabeçalho do caso: pessoa fictícia, origem, etapa, responsável e tentativas. A conversa mostra balões (consultor à direita, aluno à esquerda, notas e sistema ao centro) com autor, canal e data. O campo de envio já traz a sugestão do copiloto, marcada como tal. Ação principal: **Copiar e registrar envio**. "Outro registro" agrupa ligação atendida, ligação não atendida e nota interna.

Copiloto: frase do que fazer agora; três respostas prováveis do aluno e "Outra resposta: colar ou escrever"; leitura do assunto com correção; ação sugerida; "Por que essa sugestão". Regras em `06-copiloto.md`.

## Contrato dos controles

| Controle | Efeito persistido ou navegação verificável | Falha/limite |
|---|---|---|
| Busca global | Resultados por oferta, caso e tarefa; abre destino | Sem resultado e limpar busca |
| Filtros | Altera lista, URL e contagem; limpar restaura | Combinação sem itens |
| Card/gráfico | Navega para a lista correspondente com filtros | Amostra vazia explicada |
| Recalcular cenário | Atualiza projeção derivada e guarda premissas | Dado ausente ou inválido |
| Ofertado Sim/Não | Grava o cadastro; Não envia os matriculados à fila, com prévia do impacto; Sim os retira | Perfil sem permissão; mesmo valor repetido; versão antiga; campanha encerrada |
| Atender próximo | Atribui caso elegível e abre atendimento | Fila vazia, posse conflitante ou campanha fechada |
| Copiar e registrar envio | Copia o texto e persiste o envio com autor, data e canal | Conteúdo vazio, caso sem posse; cópia negada pelo navegador ainda registra e avisa |
| Resposta do aluno (opção ou colada) | Persiste a resposta e, no mesmo comando, o que ela confirma, com a mensagem como fonte | Conteúdo vazio; turma ofertada; caso sem posse |
| Copiar sugestão | Clipboard; feedback; fallback selecionável | Permissão do navegador negada |
| Registrar nova preferência | Atualiza preferência com fonte | Inconsistência exige confirmação |
| Comparar cursos | Quadro de diferenças, agenda e preço | Opção sem informação não vira oferta |
| Solicitar exceção | Cria aprovação com impacto calculado | Política inexistente ou pedido duplicado |
| Aprovar/recusar | Estado, justificativa e autor; notifica internamente | Sem alçada ou proposta mudou |
| Registrar aceite | Evidência e versão; reserva vaga; cria ajuste | Proposta expirada, sem vaga ou não aprovada |
| Agendar retorno | Horário/canal e tarefa no responsável | Horário passado ou inválido |
| Transferir/liberar | Responsável e trilha alterados com motivo | Sem permissão ou caso em execução crítica |
| Confirmar ajuste | Checklist + protocolo simulado; muda para efetivado | Checklist incompleto ou acordo divergente |
| Confirmar troca realizada no Lyceum | Conclui a tarefa de troca; aluno passa a "virado" | Caso sem aceite; troca já confirmada; ajuste devolvido pelo Suporte |
| Solicitar devolução | Registro único "Encaminhada ao financeiro" e tarefa de regularização no Suporte | Duplicidade ou caso em etapa que não permite saída |
| Prévia de régua | Lista de incluídos/excluídos e motivo | Público sem elegíveis |
| Simular disparo | Log por aluno; respeita paradas e idempotência | Nenhum envio externo |
| Exportar CSV/JSON | Arquivo do recorte autorizado | Campo com fórmula neutralizado no CSV |
| Importar | Selecionar arquivo, mapear, validar e confirmar prévia | Erros por linha; não substituir base silenciosamente |
| Alterar tema | Preferência salva, transição e foco mantido | Fallback sem View Transition |
| Ver como | Troca papel e redireciona se rota ficar proibida | Rótulo explícito de simulação |
| Encerrar campanha | Snapshot após checklist; bloqueia novas retiradas | Pendências ou exceções não resolvidas |
| Nova campanha | Estrutura limpa, política revisada, sem copiar alunos | Nome/data inválidos |
| Restaurar demonstração | Base determinística após confirmação local | Escopo apenas dos dados fictícios |

## Resultados por abas

Comercial: elegíveis, contatados, propostas, aceites, efetivados, recusas e motivos. Operação: tempo por etapa, backlog, reabertura e retrabalho. Experiência: pesquisa, amostra, reclamações e preferência de contato. Financeiro: cenários, concessões e valor encaminhado em pedidos de devolução. Continuidade: matrícula confirmada e observações D+7/D+30, sem fabricar atividade acadêmica.

Filtros comuns: campanha, unidade/polo, modalidade, curso/turno, período, consultor e desfecho. Período de evento e coorte de origem são controles distintos e nomeados. Exportação inclui filtros, data, definição de métrica e marca sintética.

## Estados de interface

Cada tela tem carregamento estável, vazio útil, erro recuperável, ausência de permissão e conteúdo. Não simular lentidão longa para parecer IA. Erros indicam ação possível e preservam rascunho. Use aviso inline em formulário; toast apenas como confirmação complementar. Sem botão decorativo que só mostra “Em breve”. Funcionalidade fora do escopo deve aparecer no guia, não como CTA morto.
