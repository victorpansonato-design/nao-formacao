# Previsão: três camadas de evidência

## 1. Projeção de demanda

Pergunta: **quantas matrículas válidas esta oferta deverá ter até a data de decisão?** Prever contagem e faixa, não a intenção subjetiva do CEO.

Entrada mínima: snapshots datados por oferta, matrículas válidas, cancelamentos, dias até início/decisão, calendário comercial e histórico comparável. Pipeline de leads, verba e campanhas ajudam se houver histórico confiável. Não confundir ficha criada, contrato aceito, matrícula paga e aluno ativo; preservar todas as etapas, com definição aprovada de contagem principal.

Baseline demonstrativo: `projecao = matriculas_atuais + ritmo_liquido_diario * dias_restantes`. O ritmo é derivado de uma janela informada, com piso zero para a projeção e controle de capacidade. Isso é uma **simulação de tendência**. A faixa pessimista/base/otimista da demo é um cenário, não intervalo probabilístico validado. A interface deve dizer isso no próprio gráfico.

Para produção, comparar baseline sazonal por dias até a entrada, regressão de contagem/curvas de captação e modelos com compartilhamento entre ofertas semelhantes. Escolher pelo backtest, não por sofisticação. Curso novo recebe referência de grupo e sinalização de pouca evidência; não inventar histórico próprio.

## 2. Sustentabilidade econômica

Pergunta: **a demanda projetada atende a uma condição econômica configurada?** Mostrar cenário de receita líquida, contribuição, custos incrementais e necessidade de investimento. Uma turma de 10 alunos de ticket alto pode ter melhor contribuição que uma turma de 50 de ticket baixo; o número mínimo não é universal.

Sem custo informado, mostrar “Análise econômica indisponível” e contagem/ritmo; não classificar rentabilidade só pelo número de alunos. Grade, laboratório, professores compartilhados, capacidade de sala e encontros semipresenciais precisam entrar na aprovação do cenário.

## 3. Decisão institucional

Pergunta: **o que a diretoria decidiu ofertar?** Campo formal independente. Uma turma pode ser economicamente deficitária e ser confirmada por investimento estratégico. Registrar déficit previsto, verba autorizada, justificativa, vigência e reavaliação.

Histórico de “formou/não formou” incorpora decisões estratégicas e condições antigas. Usá-lo sozinho como rótulo aprende o comportamento decisório do passado, não a sustentabilidade real. No futuro, eventual probabilidade de decisão precisa ser apresentada como tal e validada separadamente da demanda.

## UX do radar

Tabela: oferta; atuais; novos/cancelados em 7 dias; projeção base e faixa; referência econômica; diferença; qualidade dos dados; decisão; atualização. Gráfico detalhado com linha observada sólida, cenário futuro tracejado, área de faixa e marco da decisão. Clicar numa linha abre painel com dados de origem e parâmetros.

Rótulo recomendado no MVP: “Abaixo da referência no cenário base”. Não usar “82% de chance de não formar” em regra heurística. A aba “Como calculamos” mostra fórmula, janela, data, limitações e parâmetros alterados.

## Qualidade e revisão

| Falha | Tratamento |
|---|---|
| Snapshot atrasado | Badge e idade; bloquear nova previsão confiável além do limite configurado |
| Curso sem mapeamento | Quarentena e tarefa de cadastro |
| Identificador repetido | Deduplicação pela chave de matrícula, não apenas nome |
| Transferência entre turmas | Evento de saída e entrada; não contar duas vezes |
| Valor vazio/zero fora da política | Pendência; não substituir por média silenciosamente |
| Mudança na grade/modalidade | Quebra de comparabilidade documentada |
| Polo sem histórico | Modelo de grupo com incerteza e validação local |

## Validação futura com dados reais

Separar treino e teste por campanhas/entradas inteiras em ordem temporal. Snapshots do mesmo curso/entrada ficam juntos; nunca distribuir linhas quase idênticas de uma curva entre treino e teste. Avaliar horizontes D-60, D-45, D-30, D-15 relativos à decisão. Todas as variáveis precisam existir na data simulada, sem vazamento de resultado final, decisão ou verba posterior.

Métricas: MAE por oferta, erro por modalidade/polo, viés, cobertura e largura das faixas validadas. Comparar com previsão ingênua/ritmo e julgamento atual registrado na mesma data. Se houver classificação probabilística futura: Brier, log loss e curva de calibração; acurácia isolada não basta. Mostrar tamanho do conjunto de teste e cursos sem evidência.

O livro *Forecasting: Principles and Practice* fundamenta a avaliação temporal; a documentação de calibração do scikit-learn fundamenta a distinção entre score e probabilidade. Aplicação ao Anchieta é proposta de engenharia, ainda não resultado científico local.

## Evitar profecia autorrealizável

Sinal interno de risco não interrompe captação nem cancela curso automaticamente. Comunicar alternativas pode mudar a demanda que se está prevendo. Registrar quais ofertas/alunos receberam intervenção e quando; analisar esses efeitos separadamente. Após migração, recalcular capacidade dos destinos e demanda das origens; nunca interpretar uma queda provocada pela própria campanha como evidência independente de desinteresse.
