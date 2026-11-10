# Dicionário dos indicadores

## Coorte e tempo

Cada resultado informa campanha, ofertas de origem, unidade, período e regra de elegibilidade. Coorte de afetados oficiais é congelada por versão da decisão, deduplicada por matrícula/caso. Pessoas únicas aparecem em uma métrica separada quando houver mais de uma matrícula. Cancelamentos e correções não apagam o denominador histórico; geram revisão explícita.

“Neste período” pode significar eventos ocorridos no período ou coorte criada nele. O filtro deve nomear o que faz. Um aluno que aceitou em janeiro e efetivou em fevereiro não pode sumir da trilha por mudança de filtro.

| Indicador | Numerador / regra | Denominador/unidade | Observação |
|---|---|---|---|
| Em monitoramento | Matrículas em ofertas acompanhadas pendentes | Contagem por coorte | Não é aluno oficialmente afetado |
| Afetados oficiais | Casos elegíveis após não formação registrada | Contagem por campanha | Excluir duplicatas, não decisões pendentes |
| Contato útil | Casos com interação bilateral ou ligação atendida registrada | Afetados oficiais | Tentativa sem resposta não conta |
| Tentativas | Eventos válidos de tentativa | Contagem por canal | Separado de pessoas contatadas |
| Propostas válidas | Casos com proposta elegível vigente | Afetados ou contatados, rótulo explícito | Não somar versões como novos alunos |
| Aceite comercial | Casos com aceite da versão válida | Afetados oficiais | Ainda pode haver falha de execução |
| Continuidade efetivada | Casos com ajuste acadêmico conferido | Afetados oficiais | KPI comercial principal proposto |
| Conversão entre contatados | Efetivados com contato útil | Casos com contato útil | Não substituir taxa sobre total sem avisar |
| Aguardando ajuste | Casos aceitos com tarefa não concluída | Contagem e idade | Inclui devolução para correção |
| Recusas | Casos com recusa expressa registrada | Afetados oficiais | Não contato não é recusa |
| Pedido de saída | Casos que escolheram regularização/restituição | Afetados oficiais | Não rotular como falha de atendimento |
| Devoluções pendentes | Solicitações válidas ainda sem desfecho | Quantidade e saldo em centavos | Excluir duplicatas vinculadas |
| Devoluções pagas | Solicitações com evento de pagamento e comprovante | Valor e quantidade | No MVP, sempre “simulado” |
| Retrabalho de ajuste | Tarefas devolvidas/reabertas por inconsistência | Tarefas analisadas | Contar evento e casos únicos separadamente |
| Retorno cumprido | Retornos realizados na janela acordada | Retornos vencidos no recorte | Não incluir retornos futuros |
| Tempo até primeiro contato útil | Primeiro contato útil menos decisão/comunicação do caso | Mediana, p90, n | Informar calendário ou horas úteis |
| Tempo de execução | Conclusão conferida menos aceite | Mediana, p90, n | Abertos vão para idade do backlog |
| Tempo de restituição | Pagamento menos solicitação válida | Mediana, p90, n | Pedidos em aberto não viram duração zero |
| Continuidade D+7/D+30 | Casos com observação de continuidade confirmada | Convertidos com janela vencida e observável | Exibir também observação ausente |
| Reclamações | Casos com manifestação classificada no recorte | Afetados × 100 | Não inferir de sentimento do texto |
| Satisfação da solução | Respostas válidas da pergunta definida | Respondentes, escala e taxa de resposta | Não extrapolar a não respondentes |

## Financeiro e atribuição

Receita potencial e contribuição seguem `04-financeiro.md`. Painel separa cenário, contratos efetivados, recebimentos e custo de concessão. Sem dados conciliados, mostrar indisponível para receita recebida. Comissão é atribuição provisória/validada/revisão conforme política, sem pagamento no protótipo.

## Prova visual de consistência

Clicar em qualquer KPI abre a lista do numerador. Mostrar definição e denominador em ajuda contextual. Exportar filtros e `asOf`. Uma atualização do Suporte altera o mesmo conjunto que alimenta o painel, sem contadores manuais. Antes da decisão, a base fictícia de 500 em preparação deve mostrar zero afetados oficiais e zero efetivados.

## Aprendizado entre campanhas

Comparar ofertas com grade/modalidade/contexto compatíveis; registrar mudança de política, preço, calendário e capacidade. Decompor perda por sem contato, restrição de agenda, ausência de destino, valor, decisão pessoal e execução. Preferir motivos declarados; não atribuir uma causa ao aluno por inferência automática. A retrospectiva deve gerar ação e dono, por exemplo confirmar destinos mais cedo ou corrigir cadastro de horário.
