/**
 * Entidades do domínio Continua. Tudo aqui é dado sintético de demonstração.
 * Dinheiro em centavos inteiros; percentuais em pontos-base (bps); instantes em ISO 8601.
 */

export type Id = string
export type IsoInstant = string
export type IsoDate = string

export type Role = 'director' | 'manager' | 'consultant' | 'support' | 'finance' | 'admin'
export type Modality = 'presencial' | 'semipresencial'
export type Shift = 'diurno' | 'noturno' | 'agenda'

export type DecisionOutcome = 'pending' | 'confirmed' | 'not_formed' | 'strategic_confirmed' | 'suspended'
export type RiskLevel = 'low' | 'attention' | 'high' | 'insufficient_data'
export type CampaignPhase = 'anticipation' | 'operation' | 'closing' | 'closed'

export type CaseStage =
  | 'preparation'
  | 'ready'
  | 'in_contact'
  | 'scheduled'
  | 'proposal'
  | 'awaiting_execution'
  | 'converted'
  | 'refund'
  | 'unreachable'
  | 'closed'

export type CaseOutcome =
  | 'continuity'
  | 'refund'
  | 'regularization_only'
  | 'origin_confirmed'
  | 'declined'
  | 'unreachable'

export interface User {
  id: Id
  name: string
  role: Role
}

export interface Unit {
  id: Id
  name: string
}

export interface Campaign {
  id: Id
  name: string
  intake: string
  phase: CampaignPhase
  decisionReferenceDate: IsoDate
  classesStartDate: IsoDate
  closedAt?: IsoInstant
  closure?: CampaignClosure
}

export interface CampaignClosure {
  closedAt: IsoInstant
  actorId: Id
  assumedExceptions: string | null
  snapshot: KpiSnapshot
  version: number
}

/** Fotografia congelada dos indicadores no encerramento. */
export interface KpiSnapshot {
  asOf: IsoInstant
  affected: number
  usefulContact: number
  accepted: number
  converted: number
  refundRequested: number
  refundPaidCents: number
  concessionCents: number
  pendingItems: number
}

export interface Decision {
  outcome: DecisionOutcome
  version: number
  decidedAt?: IsoInstant
  actorId?: Id
  reference?: string
  reason?: string
  strategicBudgetCents?: number
  validUntil?: IsoDate
}

export interface DecisionRecord extends Decision {
  id: Id
  offeringId: Id
}

export interface OfferingEconomics {
  periodUnit: 'month'
  variableCostPerStudentCents: number
  avoidableFixedCostCents: number
}

export interface Offering {
  id: Id
  courseName: string
  modality: Modality
  unitId: Id
  shift: Shift
  schedule: string
  intake: string
  startDate: IsoDate
  capacity: number
  occupiedSeats: number
  role: 'origin' | 'destination' | 'blocked'
  tuitionCents: number
  installmentCount: number
  decision: Decision
  economics?: OfferingEconomics
  degree?: string
  area?: string
  sourceKind: 'synthetic'
}

export interface Snapshot {
  id: Id
  offeringId: Id
  asOf: IsoDate
  countValid: number
  sourceBatchId: Id
}

export interface ForecastParams {
  windowDays: number
  lowFactor: number
  highFactor: number
  updatedAt: IsoInstant
  updatedBy: Id
}

export interface StudentPreferences {
  acceptedShifts: Shift[]
  acceptedModalities: Modality[]
  contentOptIn: boolean
  preferredChannel: string
  /** Aluno pediu para não receber contatos promocionais. */
  promoOptOut?: boolean
  /** Orçamento mensal declarado, em centavos. */
  budgetCents?: number | null
  /** O que o aluno disse querer preservar (texto livre do consultor). */
  priority?: string
  /** Momento em que a rotina/turnos foram confirmados na conversa atual. */
  routineConfirmedAt?: IsoInstant | null
  budgetConfirmedAt?: IsoInstant | null
}

export interface PreferenceRevision {
  id: Id
  studentId: Id
  at: IsoInstant
  actorId: Id
  source: string
  patch: Partial<StudentPreferences>
}

export interface Student {
  id: Id
  displayName: string
  email: string
  contactLabel: string
  scope: Id[]
  preferences: StudentPreferences
  scenarioLabel?: string
  sourceKind: 'synthetic'
}

export interface Enrollment {
  id: Id
  studentId: Id
  offeringId: Id
  status: string
  externalKey?: string
  sourceKind: 'synthetic'
}

export interface Payment {
  id: Id
  enrollmentId: Id
  amountCents: number
  refundedCents: number
  creditedCents: number
  status: string
  paidAt: IsoInstant
  sourceKind: 'synthetic'
}

export interface NextAction {
  kind: 'return' | 'first_contact' | 'await_student' | 'await_approval' | 'await_support' | 'await_finance'
  at?: IsoInstant
  channel?: Channel
  note?: string
}

export interface AssignmentLease {
  actorId: Id
  acquiredAt: IsoInstant
  expiresAt: IsoInstant
  firstContactAt: IsoInstant | null
}

export interface RetentionCase {
  id: Id
  studentId: Id
  enrollmentId: Id
  campaignId: Id
  stage: CaseStage
  ownerId: Id | null
  version: number
  createdAt: IsoInstant
  nextAction: NextAction | null
  outcome?: CaseOutcome
  /** Quando a decisão oficial tornou o caso elegível à fila. */
  readyAt?: IsoInstant
  lease?: AssignmentLease | null
  attempts?: number
  /** Consultor registrou que não há alternativa adequada. */
  noSuitableOption?: boolean
  declineReason?: string
  complaint?: boolean
  sourceKind: 'synthetic'
}

export type EvidenceStatus = 'unconfirmed' | 'confirmed' | 'rejected'

export interface CrmEvidence {
  id: Id
  studentId: Id
  messageId: string
  at: IsoInstant
  excerpt: string
  kind: 'declared_alternative' | 'declared_goal' | 'observed_behavior'
  extractionStatus: EvidenceStatus
  /** Curso citado no trecho, extraído no adaptador de dados. */
  interestCourseName?: string
  reviewedBy?: Id
  reviewedAt?: IsoInstant
  sourceKind: 'synthetic'
}

export type Channel = 'whatsapp_sim' | 'call' | 'internal'
export type InteractionKind =
  | 'message'
  | 'student_reply_sim'
  | 'call_answered'
  | 'call_no_answer'
  | 'note'
  | 'system'

export interface Interaction {
  id: Id
  caseId: Id
  channel: Channel
  direction: 'out' | 'in' | 'internal'
  kind: InteractionKind
  text: string
  occurredAt: IsoInstant
  actorId: Id
  source: 'simulated'
}

export interface ProposalTerms {
  regularCents: number
  discountBps: number
  discountInstallments: number
  discountedCents: number
  installmentCount: number
  /** (regular − com desconto) × parcelas com benefício. */
  concessionCostCents: number
  /** Valor já pago que será aproveitado como crédito. */
  creditCents: number
}

export type ProposalStatus =
  | 'pending_approval'
  | 'open'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'frozen'
  | 'superseded'
  | 'cancelled'

export interface Proposal {
  id: Id
  caseId: Id
  /** Número sequencial da proposta dentro do caso. */
  number: number
  version: number
  originId: Id
  destinationId: Id
  terms: ProposalTerms
  status: ProposalStatus
  createdAt: IsoInstant
  createdBy: Id
  validUntil: IsoInstant
  approvalId?: Id
  acceptance?: { at: IsoInstant; actorId: Id; evidence: string }
  frozenReason?: string
  closedReason?: string
}

export type ApprovalLevel = 'manager' | 'director'

export interface Approval {
  id: Id
  proposalId: Id
  proposalVersion: number
  caseId: Id
  policyVersion: number
  level: ApprovalLevel
  requestedTerms: ProposalTerms
  impactCents: number
  justification: string
  requestedBy: Id
  requestedAt: IsoInstant
  status: 'pending' | 'approved' | 'rejected' | 'void'
  decidedBy?: Id
  decidedAt?: IsoInstant
  decisionReason?: string
}

export interface SeatReservation {
  id: Id
  offeringId: Id
  proposalId: Id
  expiresAt: IsoInstant
  state: 'held' | 'consumed' | 'released'
}

export interface ChecklistItem {
  id: string
  label: string
  done: boolean
}

export interface AcademicTask {
  id: Id
  caseId: Id
  kind: 'transfer' | 'regularization'
  proposalId?: Id
  proposalVersion?: number
  refundId?: Id
  checklist: ChecklistItem[]
  status: 'queued' | 'in_progress' | 'returned' | 'done' | 'cancelled'
  assigneeId: Id | null
  createdAt: IsoInstant
  completedAt?: IsoInstant
  executionReference?: string
  returns: { at: IsoInstant; actorId: Id; reason: string; resolvedAt?: IsoInstant; resolution?: string }[]
}

export type RefundStatus =
  | 'requested'
  | 'verification'
  | 'pending_info'
  | 'awaiting_payment'
  | 'paid'
  | 'closed_duplicate'
  | 'closed_undue'

export interface RefundRequest {
  id: Id
  caseId: Id
  studentId: Id
  paymentIds: Id[]
  amountCents: number
  reason: 'course_not_formed'
  requesterId: Id
  academicTaskId: Id
  idempotencyKey: string
  status: RefundStatus
  createdAt: IsoInstant
  financeOwnerId?: Id
  trail: { at: IsoInstant; actorId: Id; status: RefundStatus; note?: string }[]
  paidAt?: IsoInstant
}

export interface FollowUp {
  id: Id
  caseId: Id
  stage: 'D7' | 'D30'
  expectedAt: IsoDate
  observation: 'continuing' | 'not_continuing' | 'no_info' | null
  observedAt?: IsoInstant
  observedBy?: Id
  note?: string
}

export interface AuditEvent {
  id: Id
  commandId: string
  entityType:
    | 'offering'
    | 'case'
    | 'proposal'
    | 'approval'
    | 'task'
    | 'refund'
    | 'campaign'
    | 'journey'
    | 'student'
    | 'import'
    | 'followup'
    | 'system'
  entityId: Id
  caseId?: Id
  actorId: Id
  action: string
  summary: string
  beforeVersion?: number
  afterVersion?: number
  occurredAt: IsoInstant
}

export interface Notification {
  id: Id
  at: IsoInstant
  toRole?: Role
  toUserId?: Id
  text: string
  link?: string
  readBy: Id[]
}

export type JourneyKind = 'welcome' | 'exploration' | 'resolution'

export interface JourneyStep {
  id: Id
  title: string
  objective: string
  template: string
  channel: 'whatsapp_sim' | 'email_sim'
  scheduledFor: IsoDate
  audience: 'monitored' | 'content_opt_in' | 'alt_interest' | 'affected_no_contact'
  promotional: boolean
  version: number
}

export interface Journey {
  id: Id
  kind: JourneyKind
  name: string
  description: string
  steps: JourneyStep[]
}

export interface DispatchLogEntry {
  id: Id
  key: string
  journeyId: Id
  stepId: Id
  stepVersion: number
  studentId: Id
  caseId: Id
  at: IsoInstant
  actorId: Id
  renderedText: string
}

export interface ImportBatch {
  id: Id
  fileName: string
  checksum: string
  at: IsoInstant
  actorId: Id
  received: number
  accepted: number
  updated: number
  rejected: number
}

export interface Policies {
  label: string
  version: number
  leaseMinutes: number
  proposalValidityHours: number
  consultantDiscountBps: number
  managerDiscountBps: number
  /** Teto absoluto da demonstração; acima disso não há alçada cadastrada. */
  directorDiscountBps: number
  discountInstallments: number
  maxContactAttempts: number
  attentionGapBps: number
  snapshotMaxAgeDays: number
  destinationEadEnabled: boolean
  scenarioRevenue: {
    students: number
    monthlyTuitionCents: number
    months: number
    baselineConversionBps: number
    scenarioConversionBps: number
  }
}

export interface DemoFaults {
  /** Próxima retirada da fila encontra o caso já retirado por outro consultor. */
  queueConflictOnce: boolean
}

export interface ArchivedCampaign {
  campaign: Campaign
  archivedAt: IsoInstant
  snapshot: KpiSnapshot | null
}

export interface ClockState {
  mode: 'fixed_demo' | 'live'
  now: IsoInstant
}

export interface CommandReceipt {
  ok: boolean
  code?: string
  message?: string
  data?: unknown
}

export interface DomainState {
  schemaVersion: number
  presetId: string
  campaign: Campaign
  clock: ClockState
  units: Unit[]
  users: User[]
  offerings: Offering[]
  decisionLog: DecisionRecord[]
  /** Parecer preparado pela gestão para apoiar a decisão da diretoria. */
  decisionDrafts: Record<Id, { outcome: DecisionOutcome; note: string; actorId: Id; at: IsoInstant }>
  forecastParams: Record<Id, ForecastParams>
  students: Student[]
  enrollments: Enrollment[]
  cases: RetentionCase[]
  payments: Payment[]
  evidence: CrmEvidence[]
  preferenceRevisions: PreferenceRevision[]
  snapshots: Snapshot[]
  proposals: Proposal[]
  approvals: Approval[]
  academicTasks: AcademicTask[]
  refunds: RefundRequest[]
  interactions: Interaction[]
  events: AuditEvent[]
  notifications: Notification[]
  reservations: SeatReservation[]
  followUps: FollowUp[]
  journeys: Journey[]
  dispatchLog: DispatchLogEntry[]
  importBatches: ImportBatch[]
  archivedCampaigns: ArchivedCampaign[]
  policies: Policies
  faults: DemoFaults
  /** Resultado por commandId, para idempotência. */
  receipts: Record<string, CommandReceipt>
  seq: number
}
