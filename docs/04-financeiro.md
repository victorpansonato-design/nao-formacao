# Economia e devoluções

## O exemplo de R$ 4,5 milhões

`500 alunos × R$ 300 por mês × 30 meses = R$ 4.500.000` de receita bruta nominal de referência. Pressupõe todos os alunos continuando, preço constante, todas as parcelas pagas e nenhuma evasão. Não é lucro, receita realizada, valor presente nem ganho atribuível ao projeto.

| Continuidade efetivada | Alunos | Receita mensal nominal | 30 meses, sem perdas |
|---|---:|---:|---:|
| 0% | 0 | R$ 0 | R$ 0 |
| 20% | 100 | R$ 30.000 | R$ 900.000 |
| 40% | 200 | R$ 60.000 | R$ 1.800.000 |
| 60% | 300 | R$ 90.000 | R$ 2.700.000 |
| 80% | 400 | R$ 120.000 | R$ 3.600.000 |
| 100% | 500 | R$ 150.000 | R$ 4.500.000 |

Exemplo de incremento: se a taxa efetivada passar de 30% para 50%, são 100 continuidades adicionais e R$ 900 mil brutos nominais no mesmo cenário. Isso ainda é hipótese, não impacto observado. Receita de quem já migraria no processo atual não pode ser toda atribuída à IA.

## Modelo econômico por oferta

Para um período homogêneo:

`contribuicao = soma(receita_liquida_esperada_por_aluno - custo_variavel_incremental_por_aluno) - custos_fixos_evitaveis_da_oferta`

`n_equilibrio = teto(custos_fixos_evitaveis / contribuicao_media_por_aluno)` quando o denominador é positivo. Se contribuição por aluno ≤ 0, mostrar “Sem equilíbrio neste cenário”. Custos compartilhados têm regra de rateio explícita; não somar o custo inteiro em cada turma e depois somá-las novamente.

Exemplos totalmente sintéticos, na mesma base mensal:

- 10 alunos × R$ 3.000, variável R$ 400/aluno, fixo R$ 20.000: contribuição R$ 6.000; equilíbrio em 8 alunos.
- 50 alunos × R$ 300, variável R$ 100/aluno, fixo R$ 20.000: contribuição -R$ 10.000; equilíbrio em 100 alunos.

Esses números explicam a lógica solicitada; não representam custos ou preços do Anchieta. Recebimentos de matrícula promocional e mensalidades regulares devem ser separados.

## Calculadora de continuidade

Controles: base elegível, conversão atual de referência, conversão no cenário, ticket regular, desconto por período, duração em parcelas, permanência mensal, recebimento esperado, custo variável, custo do projeto e taxa de desconto opcional. Manter cenários salvos e histórico das premissas.

`receita_esperada = soma_mes[alunos_convertidos * permanencia_acumulada_mes * ticket_mes_liquido * taxa_recebimento_mes]`

`valor_incremental = contribuicao_esperada_com_projeto - contribuicao_esperada_baseline - custo_incremental_projeto`

Se utilizar desconto financeiro: `VP = soma_mes[fluxo_mes / (1 + taxa_mensal)^mes]`. Duração diferente por destino deve ser ponderada por aluno, não multiplicada por 30 por conveniência. Exibir premissas e sensibilidade, sem falsa precisão.

## Nomes dos indicadores

| Indicador | Significado |
|---|---|
| Receita bruta potencial de referência | Cenário antes de perdas |
| Receita nominal das mudanças efetivadas | Contratos simulados; ainda não recebimento |
| Contribuição projetada | Receita esperada menos custos configurados |
| Receita recebida | Somente pagamentos conciliados; indisponível no MVP |
| Investimento em concessões | Diferença por parcela em todo o prazo da concessão |
| Valor encaminhado ao financeiro | Saldo estimado no pedido de devolução registrado aqui; a restituição real acontece no outro sistema |

Não chamar restituição não realizada de “economia”. Troca aceita não apaga uma obrigação financeira nem transforma valor pago em nova receita. Crédito transferido entre cursos é movimentação do mesmo valor.

## Devoluções: só o registro

Revisão de 12/11/2026, pela dona do produto: o sistema de devoluções é outro, e o financeiro atua nele. O Continua **não** confere saldo, não simula pagamento e não emite comprovante. Não há perfil Financeiro.

O que existe aqui:

- Consultor responsável ou Diretoria/Gestão registram o pedido do aluno (`requestRefund`). O pedido explícito segue direto, sem exigir negociação. Propostas abertas do caso são canceladas; um aceite ainda não executado também.
- O pedido tem status único **Encaminhada ao financeiro** e mostra o valor estimado com base nos pagamentos sintéticos. Um segundo pedido para o mesmo caso é bloqueado e aponta o existente.
- É criada a tarefa de **regularização** no Suporte. Quando o Suporte conclui, o caso de saída encerra (`refund`, ou `regularization_only` se não houver valor).
- A lista de Devoluções é de leitura para todos que a veem; consultores veem os pedidos de todos os alunos (decisão de implementação, pendente de confirmação).

Contrato futuro com o sistema de devoluções: `caseId`, `studentId`, `originalPaymentIds`, `requestedAmountCents`, `reason: course_not_formed`, `requesterId`, `academicTaskId`, `idempotencyKey`, `createdAt`. Produção adaptará ao contrato real do sistema existente. Dados bancários reais não entram na demonstração.
