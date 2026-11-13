# Recomendações de continuidade

## Duas perguntas, nesta ordem

1. **O destino pode ser oferecido agora?** Filtros obrigatórios.
2. **O destino faz sentido para esta pessoa?** Comparação explicada e confirmação de interesse.

Nenhum score supera um bloqueio de disponibilidade ou uma restrição expressa do aluno.

## Elegibilidade obrigatória

Turma ofertada (`decision.outcome = 'confirmed'`; desde 12/11/2026 não existe `strategic_confirmed`), entrada compatível, unidade acessível, vaga livre/reservável, agenda compatível, modalidade permitida e condições comerciais vigentes. Duração, titulação e exigências de ingresso precisam estar cadastradas e conferidas. Validade da confirmação deve cobrir a entrada.

`eligible = confirmed && active && seatsAvailable && scheduleCompatible && locationCompatible && pricePolicyValid && entryCompatible`

Preferência desconhecida não vira compatibilidade presumida: opção aparece em “Depende de confirmar”, sem botão de proposta habilitado. Se a própria turma de origem confirmou, retirar o caso de não formação antes de negociar outra oferta.

## Evidência de interesse

| Nível | Exemplo | Tratamento |
|---|---|---|
| Declaração atual | “Quero seguir na área da saúde” | Prioridade na comparação |
| Declaração histórica com fonte | “Fiquei entre Administração e Biomedicina” | Perguntar se continua válido |
| Comportamento observado | Abriu página de Biomedicina | Sinal fraco, não prova de intenção |
| Afinidade curricular | Conteúdos próximos | Explicar sem presumir equivalência |
| Hipótese do assistente | Área relacionada a objetivo declarado | Identificar como hipótese e perguntar |

Cada evidência tem `messageId`, data, autor, trecho mínimo, extração e estado `unconfirmed/confirmed/rejected`. Correção pelo aluno substitui a preferência operacional e mantém o registro de revisão. Proibir inferência de saúde, religião, deficiência, raça ou vulnerabilidade a partir do histórico.

## Ordenação explicável do protótipo

Dentro do conjunto elegível: ordenar primeiro por interesse atual confirmado; depois por interesse histórico específico; depois por adequação ao objetivo declarado e afinidade acadêmica validada. Desempate por compatibilidade prática, custo final e preferência do aluno. Não priorizar comissão ou ticket mais alto na recomendação ao aluno.

Uma versão demonstrativa pode usar pesos editáveis: interesse explícito 40, objetivo 25, aderência curricular validada 20, preferências de rotina 15. Essas parcelas só são calculadas quando há dado; não preencher ausentes com zero como se fossem rejeição. Apresentar checklist e motivos em vez de um “87% de chance de aceite”. O índice é ordenação de adequação, não probabilidade.

## O caso que demonstra o diferencial

Marina Costa é uma personagem fictícia. Matriculada em Administração diurno, hoje trabalha à noite. Conversa `CRM-DEMO-01` registra dúvida anterior entre Administração e Biomedicina; mensagem atual confirma interesse em saúde. Biomedicina diurno tem confirmação formal, vaga e preço compatível. Resultado: sugerir comparação com Biomedicina, mesmo sem proximidade óbvia com Administração.

Explicação ao consultor: “Ela mencionou Biomedicina no CRM em 10/12. Em 27/01 confirmou que ainda considera saúde. Há turma diurna confirmada. Antes de apresentar a proposta, confirme os encontros e o orçamento.” Não falar que Administração e Biomedicina são equivalentes.

Para outra pessoa, preservar o mesmo curso mudando somente turno/unidade pode ser muito melhor que mudar de área. Ordem contextual: mesmo curso em oferta compatível; interesse alternativo explícito; objetivo profissional; cursos correlatos. A escolha atual do aluno pode reordenar tudo.

## Cartão de recomendação

Mostrar até três opções, inicialmente duas. Campos: curso/titulação; modalidade; local e agenda; início; duração; preço regular; concessão e período; total do cenário; disponibilidade verificada; razões; diferenças relevantes; perguntas pendentes; fonte acadêmica. “Comparar” abre quadro com origem e até dois destinos.

“Por que não apareceu?” mostra opções bloqueadas, com razões como “Turma ainda não confirmada” ou “Agenda incompatível”. Não revelar probabilidades internas de formação ao aluno como fatos oficiais.

## Catálogo confiável

Currículo, titulação, duração, agenda, preço e condições vêm de catálogo institucional versionado. As páginas oficiais consultadas servem para repertório inicial e identidade; não confirmam turma, vaga ou valor de 2027. Economia, Biomedicina e outros exemplos do relato não implicam que determinada oferta esteja disponível.

Salários, empregabilidade e “área em ascensão” só entram com fonte, local, período, metodologia e texto de limite. Sem isso, sugerir descrição de atividades e conversa com coordenação. Não repetir porcentagens de páginas promocionais como garantia individual. Nunca prometer equivalência entre bacharelado, licenciatura e tecnólogo ou atribuições profissionais sem validação acadêmica.

## Como avaliar

Especialista acadêmico revisa recomendações em casos cegos: elegibilidade, aderência e diferenças explicadas. Medir percentual de opções inválidas, correções pelo consultor, evidências corretas e preferência do aluno. Para aprendizado futuro, separar aceitação de adequação: aceitar uma alternativa sob pressão não prova boa recomendação. Observar permanência e satisfação depois.
