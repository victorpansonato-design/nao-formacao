# Dados, contratos e governança

## Identificadores e valores

IDs imutáveis separados de nomes e códigos externos. `offeringId` identifica uma turma: curso + modalidade + turno (com unidade e entrada como atributos). O cadastro Ofertado Sim/Não é por turma. `caseId` identifica campanha + matrícula de origem; `studentId` vincula a pessoa sem confundir duas matrículas. Chaves externas só no adaptador, não como texto de interface.

Dinheiro em centavos inteiros; porcentagens em pontos base ou número decimal com contrato explícito. Datas civis como `YYYY-MM-DD`; instantes ISO 8601 com offset/UTC, exibidos em São Paulo. Duração e mensalidade têm unidade explícita: semestres, módulos, meses e parcelas não são intercambiáveis.

## Entidades principais

| Entidade | Campos essenciais |
|---|---|
| Campaign | id, nome, entrada, dataInicio, dataDecisaoReferencia, fase, configVersion |
| CatalogCourse (real, `src/data/catalog.ts`) | name, slug, degree, isNew, formats[{modality, shifts[]}] |
| Offering | id, courseName, modality (`presencial`, `presencial_integral`, `presencial_intensivo`, `semipresencial`, `ead`, `ead_live`), shift (`diurno`, `noturno`, `integral`, `agenda`, `online`), unitId, schedule, intake, startDate, capacity, occupiedSeats, role (`origin`, `destination`, `blocked`, `catalog`), tuitionCents, installmentCount, decision, degree, isNew, sourceKind |
| Decision / DecisionRecord | outcome (`confirmed` = Ofertado, `not_formed` = Não ofertado), version, decidedAt, actorId; o histórico guarda offeringId. Sem motivo, ata ou verba |
| EnrollmentSnapshot | offeringId, asOf, countValid, newCount, canceledCount, sourceBatchId |
| Forecast | offeringId, asOf, horizonDate, method, base/low/high, evidenceStatus, parameters, modelVersion |
| EconomicsScenario | offeringId, periodUnit, variableCostCents, avoidableFixedCostCents, contribution, assumptions |
| Student | id, displayName, fictitiousContact, contactPreferences, scope |
| Enrollment | id, studentId, offeringId, externalKey, status, paymentRefs |
| RetentionCase | id, campaignId, enrollmentId, stage, ownerId, nextAction, version, outcome |
| CRMEvidence | id, studentId, messageId, at, excerpt, kind, extractionStatus, reviewedBy |
| Interaction | id, caseId, channel, direction, kind, text, occurredAt, actorId, source |
| Recommendation | caseId, destinationId, eligible, blockers, reasons, evidenceIds, needsConfirmation |
| Proposal | id, caseId, version, destinationId, terms, validity, approvalId, status |
| Approval | id, proposalVersion, policyVersion, impactCents, approver, decision, reason |
| SeatReservation | offeringId, proposalId, count, expiresAt, state |
| AcademicTask | caseId, proposalVersion, checklist, status, assigneeId, executionReference |
| RefundRequest | caseId, paymentRefs, amountCents (estimado), status (único: `requested` = "Encaminhada ao financeiro"), trail |
| AssignmentLease | caseId, actorId, version, acquiredAt, expiresAt, firstContactAt |
| AuditEvent | id, commandId, entityType, entityId, actorId, action, beforeVersion, afterVersion, occurredAt |
| FollowUp | caseId, stageD7D30, expectedAt, observation, observedAt, source |

Desde 12/11/2026, `role: 'catalog'` marca as 133 turmas só de catálogo (60 vagas e mensalidade fictícias, sem alunos). Nomes, formatos, turnos e selo vêm do site público; o resto é sintético (`15-catalogo-real.md`). Políticas incluem `consultantDiscountBps` (500) e `leadershipDiscountBps` (2000). Esquema persistido na versão 4.

Entidades de demonstração podem ser armazenadas em um único JSON normalizado. Não duplicar o mesmo preço em cinco lugares, exceto no snapshot intencional da proposta aceita, que precisa preservar a condição original.

## Importação

MVP aceita JSON e CSV UTF-8, com separador declarado, campos entre aspas e prévia. Não chamar split simples de parser CSV completo. Para XLSX, só acrescentar biblioteca e testes se o escopo for ampliado.

Mapear colunas; normalizar espaços/acentos apenas para pesquisa, preservar nome original; harmonizar “Híbrida” com “Semipresencial” por tabela revisável; validar chaves; conferir datas e centavos; detectar duplicidade; apresentar linhas inválidas e totais; confirmar importação transacional local. Um erro não pode deixar metade da base alterada sem relatório.

O lote registra origem, horário, checksum, versão, quantidade recebida/aceita/rejeitada e usuário. Reimportar o mesmo lote é idempotente. Alterações operacionais feitas dentro do sistema não são sobrescritas por colunas de origem sem regra específica.

## Dados para o modelo futuro

Histórico por oferta e entrada; snapshots de contagem datados; decisões e exceções; custos por período; origem dos leads; etapas e datas de matrícula; preços por parcela e bolsas; restrições de capacidade e calendário. Conversas de CRM ficam separadas dos dados quantitativos e entram apenas para contexto/recomendação.

Pacote inicial recomendado à TI: um dicionário com significado dos status, exportações históricas de pelo menos várias entradas comparáveis quando disponíveis, amostra desidentificada revisada e reconciliação com o total oficial. Quantidade de anos não garante qualidade: registrar lacunas e mudanças de regra.

## Governança para institucionalizar

Definir finalidade, hipótese legal por atividade, necessidade, transparência, retenção e escopo com Encarregado/Jurídico. A base adequada para operação contratual, orientação e marketing pode diferir; não assumir consentimento universal nem legítimo interesse automático. O guia da ANPD recomenda examinar finalidade, necessidade e balanceamento/salvaguardas.

Não enviar conversas reais a modelos externos sem arranjo institucional aprovado. Minimizar dados; manter dados financeiros no sistema de devoluções; restringir acesso por tarefa; pseudonimizar análises; proteger exportações e trilhas; estabelecer correção/revisão de perfis e resultados. A política de retenção será configurada após definição institucional; não inventar prazo legal universal.

Fonte de CRM pode conter informação sensível incidental: excluir do resumo e de ordenação quando não necessária. Não usar atributos protegidos ou vulnerabilidade para preço, tratamento ou fila. O cadastro Ofertado por turma é da Diretoria/Gestão; o projeto não delega acesso à educação a um modelo.

## Fronteira do protótipo

`localStorage` contém apenas dados sintéticos e configuração de demonstração; tudo é visível a quem usa o navegador. Não há proteção real de papéis, auditoria imutável, criptografia de servidor ou autenticação. Produção exige serviço autenticado, controles no servidor, logs protegidos, backup e recuperação, além de avaliação de fornecedores. O protótipo demonstra o processo e os contratos sem fingir essas garantias.
