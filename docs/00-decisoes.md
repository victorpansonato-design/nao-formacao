# Decisões, premissas e rastreabilidade

Status em 10/11/2026. Este documento evita transformar hipóteses de projeto em fatos institucionais.

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
| U08 | Gestão, diretoria, Captação, Suporte e Financeiro | `08-acessos-fila.md` |
| U09 | Suporte realiza ajuste no Lyceum | `02-processo.md` |
| U10 | Origens presencial e semipresencial | `01-estrategia.md` |
| U11 | Simular devoluções no próprio fluxo | `04-financeiro.md` |
| U12 | Antes, durante e depois da campanha | `02-processo.md` |
| U13 | Front-end funcional e todos os botões com efeito | `09-telas.md`, `12-qualidade.md` |
| U14 | Referências reais, Pinterest e animação suave | `design/`, `research/` |
| U15 | Código modular, legível e contexto econômico | `11-arquitetura.md`, `AGENTS.md` |

## Diferenças resolvidas

- O levantamento prevê distribuição automática equilibrada. A instrução atual prioriza fila geral: usar **retirada do próximo caso elegível**, com posse temporária e continuidade do mesmo responsável.
- O levantamento menciona execução integrada. Nesta entrega, Lyceum, CRM, mensagens, previsões, comprovantes e devoluções serão simulados localmente.
- O levantamento fala em processo semestral; o relato destaca pico anual. Modelar **campanhas por entrada**, permitindo campanhas semestrais sem duplicar o sistema.
- O HTML contém uma base descrita como real e mascarada. Não é dado validado para treino, prova financeira ou demonstração pública. Seus identificadores e contatos não serão publicados.
- O HTML contém mapeamentos de destinos potencialmente incoerentes. Nenhum será herdado automaticamente; catálogo e equivalências exigem validação acadêmica.
- EAD não entra na previsão de origem. No MVP, os destinos também ficam em presencial/semi. Há previsão de habilitar EAD como destino por política explícita, com a mesma confirmação formal, caso a instituição queira; não presumir disponibilidade apenas pela modalidade.
- A expressão usada para sustentar turma com déficit será **investimento estratégico autorizado**. Não fixamos um termo financeiro presumido a partir de “updown”.

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
