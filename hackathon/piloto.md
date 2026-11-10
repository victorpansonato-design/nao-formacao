# Piloto para a banca

## O problema de prazo

A banca é em 27/11/2026; a decisão de formação de referência ocorre em janeiro. Portanto, validar **preparo do atendimento, qualidade das alternativas e repasse operacional** agora. Retenção de fevereiro e receita futura aparecem como indicadores a acompanhar, não resultados já obtidos.

## Desenho proposto

Recrutar 4–6 colaboradores da Captação, Suporte e CX quando disponíveis. Usar 12 casos sintéticos em dois conjuntos de dificuldade semelhante. Cada participante realiza tarefas com o processo atual simulado e com o protótipo; alternar ordem A/B para reduzir efeito de aprendizagem. Não apresentar o mesmo caso idêntico duas vezes sem controlar esse efeito. Explicar tarefa, dar pequeno treino separado e usar o mesmo tempo máximo.

Unidade da observação: participante × caso × condição. Guardar pseudônimo, ordem, caso, horário de início/fim, assistência recebida, erro e avaliação. Não interpretar várias observações da mesma pessoa como participantes independentes. Com amostra pequena, apresentar medianas, faixa, n e limitações, sem vender significância estatística ou causalidade definitiva.

## Duas camadas de experimento

**Interface funcional:** testar acesso ao contexto, elegibilidade, proposta e repasse com o copiloto local. Isso mede o processo proposto e usabilidade, não prova IA em execução.

**IA real supervisionada fora do front-end:** em ferramenta institucionalmente autorizada, fornecer casos sintéticos, catálogo fictício e política do `implementation/copilot-system-prompt.md`. Gerar resumo, perguntas e propostas de fala. Salvar entradas/saídas, modelo exatamente exibido na ferramenta, data, configurações disponíveis e revisão humana. Usar essas saídas na avaliação; identificar separadamente o que foi gerado por modelo e o que é roteiro local.

Não é necessário integrar API no MVP para esse experimento, mas é necessário **executar a geração real** para alegar uso efetivo de IA no piloto. Este pacote não a executou nem mede seus resultados. Se a equipe não fizer essa etapa, declarar que apresentou um protótipo de experiência e regras, com IA planejada.

## Tarefas dos participantes

Ler o caso; identificar interesse/restrição relevante; escolher opção elegível ou explicar ausência; produzir primeira abordagem; registrar próximo passo; montar pacote de ajuste; em outro caso, encaminhar devolução direta. Um avaliador acadêmico/comercial revisa as opções sem saber a condição usada, quando viável.

## Indicadores e metas propostas

| Indicador | Fórmula/fonte | Meta de teste proposta |
|---|---|---|
| Tempo até plano válido | Início da tarefa até plano aprovado pelo checklist | Reduzir mediana em pelo menos 30% |
| Opção inelegível sugerida | Opções inválidas / opções apresentadas | Zero falha crítica no protótipo |
| Repasse completo | Pacotes com todos os campos / pacotes criados | Pelo menos 95%, ou exibir n exato em amostra pequena |
| Fato de CRM correto | Fatos com evidência correta / fatos usados | Zero fato inventado |
| Qualidade da abordagem | Rubrica 0–2 por dimensão | Melhorar com avaliação cega, sem meta fabricada |
| Pedido de devolução respeitado | Pedidos que seguiram diretamente / pedidos de saída | 100% |

Metas são propostas de experimento, não compromissos institucionais nem dados observados. Um bloqueio por regra crítica pesa mais que ganho de tempo. Reportar falhas, casos sem plano e assistência; não descartar tentativas difíceis para melhorar média.

## Rubrica da abordagem, 0–2 cada

Informação correta; reconhecimento do impacto; pergunta relevante; alternativa adequada; condições claras; escolha respeitada; próximo passo verificável. Total 14. Um erro sobre turma, preço ou direito de saída é falha crítica, mesmo com total alto. Dois revisores em parte dos casos ajudam a identificar divergências.

## Coleta e apresentação

Usar `hackathon/resultados-template.md` por sessão. Registrar versão do protótipo e cenário. Comparar mediana do tempo por participante/condição e resumir diferenças pareadas; apresentar contagem de erros e denominadores. Acrescentar falas autorizadas dos testadores, sem dados reais de alunos.

Preparar quadro de antes/depois somente após coleta. Se o ganho não atingir meta, explicar gargalo e ajuste. Não usar o cenário de R$ 4,5 milhões como resultado do teste.

## Indicadores de produção em 2027

Efetivados / afetados elegíveis na coorte; contatados únicos / afetados; retorno cumprido / agendado; tempo da decisão ao primeiro contato útil; tempo do aceite à execução; erro/reabertura de ajuste; tempo de restituição; continuidade observada em D+7 e D+30; reclamações por 100 casos; contribuição incremental estimada com baseline explícito.

Separar resultados da operação, adoção do copiloto e qualidade do modelo. Melhor atendimento pode gerar uma devolução rápida e justa; esse desfecho também deve aparecer como solução concluída.
