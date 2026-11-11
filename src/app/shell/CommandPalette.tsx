import { CornerDownLeft, MessagesSquare, Radar, Search, Undo2, Users, Wrench, type LucideIcon } from 'lucide-react'
import { Dialog as D } from 'radix-ui'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { canAccess } from '@/domain/access'
import { DECISION, offeringLabel, offeringMeta, REFUND, STAGE, TASK, TASK_KIND } from '@/domain/labels'
import type { DomainState, Role } from '@/domain/types'
import { useActor, useDomain } from '@/services/store'
import { searchKey } from '@/shared/format'
import { cn } from '@/shared/lib/cn'
import { Kbd } from '@/shared/ui/primitives'

interface Hit {
  id: string
  group: string
  icon: LucideIcon
  title: string
  subtitle: string
  to: string
}

/** Busca global por oferta, caso/aluno e tarefa, limitada ao que o perfil pode abrir. */
function search(d: DomainState, role: Role, actorId: string, query: string): Hit[] {
  const q = searchKey(query.trim())
  if (q.length < 2) return []
  const hits: Hit[] = []
  const match = (...parts: string[]) => parts.some((p) => searchKey(p).includes(q))
  const students = new Map(d.students.map((s) => [s.id, s]))
  const offeringOfEnrollment = new Map(d.enrollments.map((e) => [e.id, e.offeringId]))
  const offerings = new Map(d.offerings.map((o) => [o.id, o]))

  if (canAccess(role, 'ofertas')) {
    for (const o of d.offerings) {
      if (match(o.courseName, o.id, o.shift, o.modality)) hits.push({ id: o.id, group: 'Ofertas', icon: Radar, title: offeringLabel(o), subtitle: `${offeringMeta(o)} · ${DECISION[o.decision.outcome].label}`, to: `/ofertas/${o.id}` })
    }
  }
  const caseRoute = role === 'consultant' ? 'atendimentos' : canAccess(role, 'alunos') ? 'alunos' : null
  if (caseRoute) {
    for (const c of d.cases) {
      const student = students.get(c.studentId)
      if (!student) continue
      // Dados pessoais só quando necessários: consultor busca nos próprios casos.
      if (role === 'consultant' && c.ownerId !== actorId) continue
      if (!match(student.displayName, c.id)) continue
      const origin = offerings.get(offeringOfEnrollment.get(c.enrollmentId) ?? '')
      hits.push({ id: c.id, group: role === 'consultant' ? 'Meus atendimentos' : 'Alunos e casos', icon: role === 'consultant' ? MessagesSquare : Users, title: student.displayName, subtitle: `${c.id} · ${origin ? offeringLabel(origin) : ''} · ${STAGE[c.stage].label}`, to: `/${caseRoute}/${c.id}` })
      if (hits.length > 40) break
    }
  }
  if (canAccess(role, 'ajustes')) {
    for (const t of d.academicTasks) {
      const c = d.cases.find((x) => x.id === t.caseId)
      const name = c ? (students.get(c.studentId)?.displayName ?? '') : ''
      if (match(t.id, t.executionReference ?? '', role === 'support' || role === 'manager' ? name : '')) hits.push({ id: t.id, group: 'Ajustes acadêmicos', icon: Wrench, title: `${TASK_KIND[t.kind]} · ${t.id}`, subtitle: `${name} · ${TASK[t.status].label}`, to: `/ajustes/${t.id}` })
    }
  }
  if (canAccess(role, 'devolucoes')) {
    for (const r of d.refunds) {
      const name = students.get(r.studentId)?.displayName ?? ''
      if (match(r.id, r.caseId, role === 'finance' || role === 'manager' ? name : '')) hits.push({ id: r.id, group: 'Devoluções', icon: Undo2, title: `Devolução ${r.id}`, subtitle: `${name} · ${REFUND[r.status].label}`, to: `/devolucoes/${r.id}` })
    }
  }
  return hits.slice(0, 30)
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const actor = useActor()
  const domain = useDomain((d) => d)
  const navigate = useNavigate()
  const hits = useMemo(() => (open ? search(domain, actor.role, actor.id, query) : []), [open, domain, actor, query])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])
  useEffect(() => setIndex(0), [query])

  const go = (hit: Hit) => {
    onOpenChange(false)
    navigate(hit.to)
  }
  let lastGroup = ''
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-overlay data-[state=open]:animate-[fade-in_160ms_ease-out]" />
        <D.Content className="fixed top-[12dvh] left-1/2 z-50 flex max-h-[70dvh] w-[calc(100vw-24px)] max-w-[600px] -translate-x-1/2 flex-col overflow-hidden rounded-dlg border border-line bg-raised shadow-popover outline-none data-[state=open]:animate-[fade-in_160ms_ease-out]">
          <D.Title className="sr-only">Busca global</D.Title>
          <D.Description className="sr-only">Busque por oferta, aluno, caso ou tarefa</D.Description>
          <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-line px-4">
            <Search className="size-4 shrink-0 text-subtle" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  setIndex((i) => Math.min(hits.length - 1, i + 1))
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  setIndex((i) => Math.max(0, i - 1))
                } else if (event.key === 'Enter' && hits[index]) go(hits[index])
              }}
              role="combobox"
              aria-expanded={hits.length > 0}
              aria-controls="palette-results"
              aria-activedescendant={hits[index] ? `hit-${hits[index].id}` : undefined}
              aria-label="Buscar oferta, aluno, caso ou tarefa"
              placeholder="Buscar oferta, aluno, caso ou tarefa…"
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle"
            />
            {query ? (
              <button type="button" className="text-[13px] text-muted hover:text-fg" onClick={() => setQuery('')}>
                Limpar
              </button>
            ) : null}
          </div>
          <div id="palette-results" role="listbox" aria-label="Resultados" className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {query.trim().length < 2 ? (
              <p className="px-3 py-6 text-center text-[13px] text-muted">Digite ao menos duas letras. A busca cobre o que o seu perfil pode abrir.</p>
            ) : hits.length === 0 ? (
              <p className="px-3 py-6 text-center text-[13px] text-muted">Nada encontrado para “{query.trim()}”. Confira a grafia ou busque pelo código do caso.</p>
            ) : (
              hits.map((hit, i) => {
                const header = hit.group !== lastGroup
                lastGroup = hit.group
                const Icon = hit.icon
                return (
                  <div key={`${hit.group}-${hit.id}`}>
                    {header ? <p className="px-2.5 pt-2 pb-1 text-xs font-medium text-subtle">{hit.group}</p> : null}
                    <button
                      type="button"
                      id={`hit-${hit.id}`}
                      role="option"
                      aria-selected={i === index}
                      onMouseEnter={() => setIndex(i)}
                      onClick={() => go(hit)}
                      className={cn('flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left', i === index && 'bg-hover')}
                    >
                      <Icon className="size-4 shrink-0 text-muted" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{hit.title}</span>
                        <span className="block truncate text-xs text-muted">{hit.subtitle}</span>
                      </span>
                      {i === index ? <CornerDownLeft className="size-3.5 shrink-0 text-subtle" aria-hidden /> : null}
                    </button>
                  </div>
                )
              })
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3 border-t border-line px-4 py-2 text-xs text-muted max-md:hidden">
            <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navegar</span>
            <span className="flex items-center gap-1"><Kbd>Enter</Kbd> abrir</span>
            <span className="flex items-center gap-1"><Kbd>Esc</Kbd> fechar</span>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}
