import { useEffect, useState } from 'react'
import type { Result } from '@/domain/errors'
import type { Approval } from '@/domain/types'
import { useDispatch } from '@/services/store'
import { money, pct } from '@/shared/format'
import { Button } from '@/shared/ui/button'
import { CommandError, toast } from '@/shared/ui/feedback'
import { Dialog } from '@/shared/ui/overlays'
import { Callout, Field, Textarea } from '@/shared/ui/primitives'

/** Decisão de exceção: aprovar ou recusar, com justificativa registrada. */
export function DecideDialog({ approval, decision, onClose }: { approval: Approval | null; decision: 'approved' | 'rejected'; onClose: () => void }) {
  const dispatch = useDispatch()
  const [reason, setReason] = useState('')
  const [result, setResult] = useState<Result<unknown> | null>(null)
  useEffect(() => {
    setReason('')
    setResult(null)
  }, [approval?.id, decision])
  if (!approval) return null
  const approving = decision === 'approved'
  const t = approval.requestedTerms
  const submit = () => {
    const r = dispatch('decideApproval', { approvalId: approval.id, decision, reason })
    setResult(r)
    if (r.ok) {
      toast(approving ? 'Exceção aprovada. A condição já está na proposta.' : 'Exceção recusada. A proposta segue na condição padrão.')
      onClose()
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={approving ? 'Aprovar exceção comercial' : 'Recusar exceção comercial'}
      description="A decisão fica registrada com autor, horário e justificativa, e o consultor é avisado internamente."
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant={approving ? 'primary' : 'danger'} onClick={submit}>
            {approving ? 'Aprovar exceção' : 'Recusar exceção'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Callout tone={approving ? 'brand' : 'neutral'}>
          {approving
            ? `A proposta passa a valer com ${pct(t.discountBps)} por ${t.discountInstallments} parcelas: ${money(t.discountedCents)} e depois ${money(t.regularCents)}. Custo da concessão: ${money(approval.impactCents)}.`
            : 'A proposta volta a ficar aberta na condição padrão. Recusar a exceção não impede o aluno de pedir devolução.'}
        </Callout>
        <Field label="Justificativa" optional={approving} hint={approving ? 'Registre o critério usado, para casos equivalentes.' : 'Obrigatória: o consultor vai ler este motivo.'}>
          {(p) => <Textarea {...p} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
        <CommandError result={result} />
      </div>
    </Dialog>
  )
}
