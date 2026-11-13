import { useState } from 'react'
import { BadgeCheck } from 'lucide-react'
import type { Result } from '@/domain/errors'
import { offeringMeta } from '@/domain/labels'
import type { RetentionCase } from '@/domain/types'
import { useActor, useDispatch, useDomain } from '@/services/store'
import { Button } from '@/shared/ui/button'
import { ConfirmDialog, toast } from '@/shared/ui/feedback'
import { Callout } from '@/shared/ui/primitives'

/**
 * Confirmação manual de que a troca aceita já foi feita no Lyceum (comando `confirmTransfer`).
 * Aparece só para o consultor responsável ou a Diretoria/Gestão, em caso "Aguardando ajuste".
 * Usado no atendimento e no detalhe da proposta: não recriar em outra tela.
 */
export function ConfirmTransfer({ caseItem, className }: { caseItem: RetentionCase; className?: string }) {
  const actor = useActor()
  const domain = useDomain((d) => d)
  const dispatch = useDispatch()
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<Result<unknown> | null>(null)
  const mayConfirm = actor.role === 'manager' || (actor.role === 'consultant' && caseItem.ownerId === actor.id)
  const task = domain.academicTasks.find((t) => t.caseId === caseItem.id && t.kind === 'transfer' && t.status !== 'cancelled' && t.status !== 'done')
  if (!mayConfirm || caseItem.stage !== 'awaiting_execution' || !task) return null
  const proposal = domain.proposals.find((p) => p.id === task.proposalId)
  const destination = domain.offerings.find((o) => o.id === proposal?.destinationId)
  const student = domain.students.find((s) => s.id === caseItem.studentId)
  const confirm = () => {
    const r = dispatch('confirmTransfer', { caseId: caseItem.id })
    setResult(r)
    if (r.ok) {
      setOpen(false)
      toast(`Troca confirmada: ${student?.displayName ?? caseItem.id} está com a continuidade efetivada.`)
    }
  }
  return (
    <>
      <Button variant="primary" className={className} onClick={() => { setResult(null); setOpen(true) }}>
        <BadgeCheck aria-hidden />
        Confirmar troca realizada no Lyceum
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Confirmar troca realizada no Lyceum?"
        description={`${student?.displayName ?? caseItem.id} · ${caseItem.id}`}
        confirmLabel="Confirmar troca realizada"
        onConfirm={confirm}
        result={result}
      >
        <p className="text-sm">
          Esta é uma confirmação manual: você declara que o aluno já está matriculado na turma de destino no Lyceum. O Continua não altera o Lyceum.
        </p>
        {destination ? (
          <Callout title="Turma de destino">
            {destination.courseName} · {offeringMeta(destination, domain.units.find((u) => u.id === destination.unitId)?.name)}
          </Callout>
        ) : null}
        <p className="text-sm text-muted">Ao confirmar, a tarefa de mudança de oferta é concluída e o caso passa a contar como continuidade efetivada.</p>
      </ConfirmDialog>
    </>
  )
}
