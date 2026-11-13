# Decisões, premissas e rastreabilidade

Status em 10/11/2026, com a revisão de 12/11/2026 ao final. Este documento evita transformar hipóteses de projeto em fatos institucionais. Quando uma decisão abaixo contradiz a seção de 12/11/2026, vale a de 12/11/2026.

## Ordem de autoridade

Relato atual de Victor > regulamento do hackathon para a competição > levantamento de processo para o fluxo existente > HTML apenas como inspiração de processo > propostas deste planejamento. Fontes externas sustentam técnicas; não definem políticas do Anchieta.

## O que veio do usuário

| ID | Requisito | Onde foi tratado |
|---|---|---|
| U01 | Antecipar risco com matrículas reais e dados limpos | `03-previsao.md`, `10-dados.md` |
| U02 | Considerar ticket, custos e investimento estratégico | `03-previsao.md`, `04-financeiro.md` |
| U03 | Recuperar interesses nas conversas do CRM | `05-recomendacoes.md` |
| U04 | Negociar apenas destinos com turma formada | `02-processo.md`, `05-recomendacoes.md` |
| U05 | Preparar relação aproximadamente um mês antes da decisão | `07-comunicacao.md` |
| U06 | Copiloto especializado em conversa delicada, repertório e negociação | `06-copiloto.md` |
| U07 | Fila geral, considerando comissão | `08-acessos-fila.md` |
| U08 | Gestão, diretoria, Captação, Suporte e Financeiro (revisto em 12/11/2026: perfil único Diretoria/Gestão; Financeiro removido) | `08-acessos-fila.md` |
| U09 | Suporte realiza ajuste no Lyceum | `02-processo.md` |
| U10 | Origens presencial e semipresencial | `01-estrategia.md` |
| U11 | Simular devoluções no próprio fluxo (revisto em 12/11/2026: só o pedido é registrado; a devolução acontece em outro sistema) | `04-financeiro.md` |
| U12 | Antes, durante e depois da campanha | `02-processo.md` |
| U13 | Front-end funcional e todos os botões com efeito | `09-telas.md`, `12-qualidade.md` |
| U14 | Referências reais, Pinterest e animação suave | `design/`, `research/` |
| U15 | Código modular, legível e contexto econômico | `11-arquitetura.md`, `AGENTS.md` |

## Diferenças resolvidas

- O levantamento prevê distribuição automática equilibrada. A instrução atual prioriza fila geral: usar **retirada do próximo caso elegível**, com posse temporária e continuidade do mesmo responsável.
- O levantamento menciona execução integrada. Nesta entrega, Lyceum, CRM, mensagens e previsões são simulados localmente; desde 12/11/2026 a devolução só é registrada (sem comprovante), pois ocorre em outro sistema.
- O levantamento fala em processo semestral; o relato destaca pico anual. Modelar **campanhas por entrada**, permitindo campanhas semestrais sem duplicar o sistema.
- O HTML contém uma base descrita como real e mascarada. Não é dado validado para treino, prova financeira ou demonstração pública. Seus identificadores e contatos não serão publicados.
- O HTML contém mapeamentos de destinos potencialmente incoerentes. Nenhum será herdado automaticamente; catálogo e equivalências exigem validação acadêmica.
- (Revisto em 12/11/2026: o catálogo real inclui EAD e EAD Live, e uma turma sintética de origem passou a EAD; ver `15-catalogo-real.md`.) EAD não entra na previsão de origem. No MVP, os destinos também ficam em presencial/semi. Há previsão de habilitar EAD como destino por política explícita, com a mesma confirmação formal, caso a instituição queira; não presumir disponibilidade apenas pela modalidade.
- ~~A expressão usada para sustentar turma com déficit será **investimento estratégico autorizado**.~~ Substituído em 12/11/2026: o sistema não registra análise nem motivo de formação; só Ofertado Sim/Não.

## Datas e pressupostos

| Item | Status |
|---|---|
| Início de aulas 02/02/2027 | Informado pelo usuário; configurável por entrada |
| Decisão 26/01/2027 | Referência calculada como uma semana antes; não é data oficial |
| Início da preparação 26/12/2026 | Um mês antes da referência de decisão |
| Operação em 28/12/2026 | Proposta para início em dia útil; não compromisso institucional |
| Banca 27/11/2026, 14h30 | Regulamento recebido |
| Uso até segunda semana de janeiro | Prazo desejado do levantamento; depende da TI e dados |
| 500 alunos, R$ 300, 30 meses | Exemplo do usuário; cenário, não diagnóstico comprovado |
| SLA, descontos, comissões, vagas e custos | Não fornecidos; parâmetros de demonstração |
| Probabilidades e ranking de afinidade | Não medidos; simulações explicáveis |

## Perguntas para os donos do processo, sem bloquear o protótipo

| Decisão a obter | Responsável sugerido | Consequência |
|---|---|---|
| Quais ofertas podem ser confirmadas cedo? | Graduação/diretoria | Sem isso há preparação de vínculo, mas não proposta de destino |
| Custos evitáveis, compartilhados e investimentos estratégicos | Financeiro/diretoria | Habilita análise econômica confiável |
| Significado de matrícula válida e momento do pagamento | TI/Captação | Evita contar fichas como alunos confirmados |
| Chaves do CRM e histórico de decisões por entrada | TI/Comercial | Viabiliza dados rastreáveis e backtest |
| Política de concessão e quem pode autorizar | Comercial/Financeiro | Impede ofertas inexequíveis |
| Regra de atribuição e estorno de comissão | Comercial/RH/Financeiro | Impede disputa de caso e pagamento duplicado |
| Horários, canais e limites de contato | CX/Comercial | Ajusta cadência e preferência do aluno |
| Cancelamento, restituição e retenção dos registros | Jurídico/Encarregado/Financeiro | Define textos e execução conforme o caso |

Todo número demonstrativo deve carregar `sourceKind: synthetic`. Não há evidência, neste planejamento, de taxa atual de reversão, tempo médio atual, inadimplência ou custo real por curso.

## 12/11/2026 — Perfil único, oferta Sim/Não, painel e catálogo real

Pedido da dona do produto nesta data. "Dona" = decisão da dona do produto; "Implementação" = decisão tomada na implementação, pendente de confirmação dela.

| # | Decisão | Quem | Substitui |
|---|---|---|---|
| D1 | Perfil único **Diretoria/Gestão** (role `manager`, usuário `DEMO-USER-GEST`). Perfis atuais: Diretoria/Gestão, Consultor, Suporte, Admin técnico. Financeiro removido ("não faz sentido") | Dona | Seis perfis: Diretoria, Gestão/CX, Consultor, Suporte, Financeiro, Admin |
| D2 | Não há aprovação nem análise de formação de turma. A Diretoria/Gestão só cadastra **Ofertado: Sim ou Não** (`DecisionOutcome = 'confirmed' \| 'not_formed'`). Toda turma começa Ofertada | Dona | Estados pendente, estratégico, suspenso; justificativa, ata, parecer, investimento estratégico |
| D3 | O Sim/Não vale por **curso + modalidade + turno**. Na lista, separada por modalidade, uma linha por curso com os turnos lado a lado, cada um com seu Sim/Não. Todo curso exibido mostra a modalidade real | Dona | Decisão por oferta com unidade e entrada exibidas como chave de tela |
| D4 | **Não ofertado** envia os matriculados direto para a fila dos consultores; antes de salvar, o sistema mostra quantos alunos serão afetados. Voltar a Ofertado tira os casos ativos da fila (desfecho "oferta de origem confirmada") e cancela propostas abertas deles; marcar Não de novo devolve os casos à fila geral sem responsável | Dona | Decisão oficial em duas etapas com vigência |
| D5 | Primeira tela da Diretoria/Gestão é o **Painel** (`/visao-geral`): afetados, contatados e a contatar, virados, rosca da situação, equipe por consultor, cartão do catálogo com Sim/Não e pop-up quase em tela cheia (Todos/Ofertados/Não ofertados). Sem rolagem no desktop e com animação de entrada. Números só de `leadershipPanel`. Ver `16-painel-diretoria-gestao.md` | Dona | Visão geral com próxima decisão e radar |
| D6 | **Virado** = troca para outra turma ofertada feita no Lyceum e confirmada manualmente (`confirmTransfer`, botão "Confirmar troca realizada no Lyceum" no atendimento e na proposta). Consultor responsável ou Diretoria/Gestão confirmam; o Suporte ainda pode concluir pelo checklist; bloqueado enquanto o ajuste estiver devolvido pelo Suporte. Aceite sozinho não conta | Dona | Efetivação só pelo Suporte |
| D7 | Aba **Ofertas** com botões Todos / Ofertados / Não ofertados (`?decisao=ofertados\|nao-ofertados`), iguais para Suporte, Consultor e Diretoria/Gestão; só a Diretoria/Gestão altera | Dona | Radar com decisão na linha |
| D8 | **Devoluções** acontecem em outro sistema, onde o financeiro atua. Aqui só se registra o pedido (status único "Encaminhada ao financeiro") e a regularização acadêmica no Suporte; o caso de saída encerra quando o Suporte conclui. Sem conferência, pagamento simulado ou comprovante. Pedido explícito segue direto, sem negociação | Dona | Trilha Solicitação → Verificação → Pagamento, comprovante TXT |
| D9 | **Catálogo real** do site público (https://anchieta.br/graduacao/, coletado em 12/11/2026): 82 cursos, 149 turmas, 30 com selo "Novo". Vagas, mensalidades, matrículas e alunos seguem sintéticos. Ver `15-catalogo-real.md` | Dona | Catálogo inteiramente sintético; EAD fora do MVP |
| D10 | Alçada de desconto em nível único: consultor até 5%; acima disso até 20% (`leadershipDiscountBps` = 2000) a Diretoria/Gestão aprova; acima de 20% não há política | Implementação (consequência de D1) | Alçadas separadas de gestão e diretoria |
| D11 | Cenários: Antecipação, Operação, **Em andamento** (`progress`, novo, cenário de abertura: dois terços da fila distribuídos entre os três consultores), Pós-início, Encerrada. Esquema persistido na versão 4: dados salvos de versões anteriores voltam à base de demonstração | Implementação | Abertura em Antecipação; esquema 3 |
| D12 | Consultores veem na lista de Devoluções os pedidos de todos os alunos (como já era) | Implementação | — |
| D13 | Mensalidade e vagas das turmas só de catálogo são fictícias (60 vagas) | Implementação | — |
| D14 | Fatos públicos do catálogo (nomes, formatos, turnos, selo) podem ficar no repositório público; dados internos e pessoais continuam proibidos | Implementação, a partir de D9 | "Dados reais não vão para este repositório" sem distinção |

Pendentes de confirmação da dona do produto: D10, D11, D12, D13 e D14. A convenção de turno "Encontros agendados"/"Online" (D9) é um limite conhecido, registrado em `15-catalogo-real.md`.
