# Telas, navegação e ações

## Estrutura global

Produto interno para trabalho intenso em desktop, responsivo para consulta e execução simples em mobile. Sidebar fixa de 232 px, topo com campanha/unidade, busca global, ajuda, tema e perfil de demonstração. Área principal com título, contexto curto e uma ação primária por tarefa. Dados e datas em pt-BR; fuso `America/Sao_Paulo`.

Menu por necessidade: Visão geral, Radar de ofertas, Alunos, Atendimentos, Comunicação, Ajustes acadêmicos, Devoluções, Resultados e Configurações. Papel determina itens e ações disponíveis. Não criar 15 itens equivalentes no menu.

## Catálogo de rotas

| Rota | Usuário principal | Conteúdo e ação central |
|---|---|---|
| `/visao-geral` | Gestão/diretoria | Próxima decisão, alunos por etapa, saúde operacional; abrir detalhe |
| `/ofertas` | Diretoria/gestão | Radar, comparação por unidade/turno e decisão; revisar oferta |
| `/ofertas/:id` | Diretoria | Curva, economia, qualidade e registro de decisão |
| `/alunos` | Gestão/CX | Busca, filtros, casos, responsável e desfecho |
| `/alunos/:id` | Equipe autorizada | Jornada, evidências CRM, propostas, tarefas e eventos |
| `/atendimentos` | Consultor | Fila geral, meus retornos e botão Atender próximo |
| `/atendimentos/:id` | Consultor | Conversa, contexto, opções e copiloto; registrar próximo passo |
| `/propostas/:id` | Consultor/gestão | Comparação, condição, aprovação e aceite simulado |
| `/aprovacoes` | Gestão/diretoria | Solicitações de exceção, impacto e decisão |
| `/comunicacao` | CX/gestão | Réguas, prévia, exclusões e eventos simulados |
| `/ajustes` | Suporte | Fila de execução e checklist por caso |
| `/ajustes/:id` | Suporte | Acordo completo, pendências e confirmação Lyceum simulada |
| `/devolucoes` | Financeiro | Valor em andamento, status e duplicidades |
| `/devolucoes/:id` | Financeiro | Conferência, saldo, trilha e comprovante demonstrativo |
| `/resultados` | Gestão/diretoria | Comercial, operação, experiência, financeiro e continuidade |
| `/configuracoes` | Admin/gestão | Campanha, catálogo, políticas, importação e reset |
| `/ajuda` | Todos | Glossário, guia e limites da demonstração |
| `/demo/controle` | Apresentador | Relógio, cenário, falhas simuladas e restaurar base |

## Visão geral: cenário antes da decisão

Faixa superior com campanha, “Dados de demonstração”, data de referência e última atualização. Painel principal: radar de ofertas e data da próxima revisão. Ao lado: qualidade de dados e pendências. Abaixo: alunos em preparação, interesses alternativos conhecidos e destinos confirmados com capacidade.

Quatro indicadores de contexto no máximo; nenhum dado existe apenas num card. Cada indicador abre lista filtrada que reconcilia com seu número. Distinguir “Em monitoramento” de “Afetados por decisão oficial”. Sem decisões, afetados oficiais = 0, mesmo que 500 estejam em preparo.

## Visão geral: operação após decisão

Dar destaque a alunos aguardando primeiro contato, retornos vencidos, aceites aguardando ajuste e devoluções pendentes. Funil com contagens absolutas e denominador. Se houver gargalo no Suporte, mostrá-lo explicitamente em vez de comemorar todos os aceites como resolvidos.

## Atendimento: a tela mais importante

Em 1440 px, sidebar + três regiões: contexto/lista compacta (260 px), conversa (flexível, mínimo 400 px) e copiloto (340 px, recolhível). Em 1280 px, contexto em drawer; conversa e copiloto permanecem. Em largura menor, abas Conversa/Contexto/Copiloto com estado preservado. Não comprimir três painéis ilegíveis em 390 px.

Cabeçalho do caso: pessoa fictícia, origem, status, responsável, prazo e canal. A conversa usa espaçamento de leitura, diferencia nota interna de mensagem e mostra origem/data. Composer com ações Registrar mensagem simulada e Registrar ligação; ambas criam eventos e atualizam próximo passo. Copiar sugestão não equivale a enviar.

Copiloto apresenta síntese em até 6 linhas, fontes expansíveis, pergunta recomendada e alternativas. A ação “Criar proposta” usa opção elegível, abre resumo e revalida dados. Indicar condições ainda não confirmadas no próprio cartão, sem esconder tudo em tooltip.

## Contrato dos controles

| Controle | Efeito persistido ou navegação verificável | Falha/limite |
|---|---|---|
| Busca global | Resultados por oferta, caso e tarefa; abre destino | Sem resultado e limpar busca |
| Filtros | Altera lista, URL e contagem; limpar restaura | Combinação sem itens |
| Card/gráfico | Navega para a lista correspondente com filtros | Amostra vazia explicada |
| Recalcular cenário | Atualiza projeção derivada e guarda premissas | Dado ausente ou inválido |
| Registrar decisão | Evento oficial simulado e criação idempotente de casos | Papel sem alçada; repetição; versão antiga |
| Atender próximo | Atribui caso elegível e abre atendimento | Fila vazia, posse conflitante ou campanha fechada |
| Registrar contato | Persiste evento, autor, data e canal | Conteúdo vazio ou caso sem posse |
| Copiar sugestão | Clipboard; feedback; fallback selecionável | Permissão do navegador negada |
| Simular próxima resposta | Expande hipótese escolhida, sem mensagem real | Identificar como simulação |
| Registrar nova preferência | Atualiza preferência com fonte | Inconsistência exige confirmação |
| Comparar cursos | Quadro de diferenças, agenda e preço | Opção sem informação não vira oferta |
| Solicitar exceção | Cria aprovação com impacto calculado | Política inexistente ou pedido duplicado |
| Aprovar/recusar | Estado, justificativa e autor; notifica internamente | Sem alçada ou proposta mudou |
| Registrar aceite | Evidência e versão; reserva vaga; cria ajuste | Proposta expirada, sem vaga ou não aprovada |
| Agendar retorno | Horário/canal e tarefa no responsável | Horário passado ou inválido |
| Transferir/liberar | Responsável e trilha alterados com motivo | Sem permissão ou caso em execução crítica |
| Confirmar ajuste | Checklist + protocolo simulado; muda para efetivado | Checklist incompleto ou acordo divergente |
| Solicitar devolução | Registro único com saldo e tarefas | Duplicidade ou saldo indisponível |
| Simular pagamento | Evento e comprovante TXT demonstrativo | Saldo mudou ou pagamento duplicado |
| Baixar comprovante | Download do documento demonstrativo do caso | Nenhum comprovante disponível |
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

Comercial: elegíveis, contatados, propostas, aceites, efetivados, recusas e motivos. Operação: tempo por etapa, backlog, reabertura e retrabalho. Experiência: pesquisa, amostra, reclamações e preferência de contato. Financeiro: cenários e concessões, saldo e pagamentos simulados. Continuidade: matrícula confirmada e observações D+7/D+30, sem fabricar atividade acadêmica.

Filtros comuns: campanha, unidade/polo, modalidade, curso/turno, período, consultor e desfecho. Período de evento e coorte de origem são controles distintos e nomeados. Exportação inclui filtros, data, definição de métrica e marca sintética.

## Estados de interface

Cada tela tem carregamento estável, vazio útil, erro recuperável, ausência de permissão e conteúdo. Não simular lentidão longa para parecer IA. Erros indicam ação possível e preservam rascunho. Use aviso inline em formulário; toast apenas como confirmação complementar. Sem botão decorativo que só mostra “Em breve”. Funcionalidade fora do escopo deve aparecer no guia, não como CTA morto.
