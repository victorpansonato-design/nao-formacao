import { useEffect, useState } from 'react'
import type { Result } from '@/domain/errors'
import { DEFAULT_FORECAST, type OfferingForecast } from '@/domain/forecast'
import type { Offering } from '@/domain/types'
import { useDispatch } from '@/services/store'
import { Button } from '@/shared/ui/button'
import { CommandError, toast } from '@/shared/ui/feedback'
import { Dialog } from '@/shared/ui/overlays'
import { Field, Input } from '@/shared/ui/primitives'

/** Recalcular cenário: altera só as premissas da projeção; guarda quem e quando. */
export function RecalcDialog({ offering, forecast, open, onOpenChange }: { offering: Offering; forecast: OfferingForecast; open: boolean; onOpenChange: (open: boolean) => void }) {
  const dispatch = useDispatch()
  const [windowDays, setWindowDays] = useState('')
  const [low, setLow] = useState('')
  const [high, setHigh] = useState('')
  const [result, setResult] = useState<Result<unknown> | null>(null)
  useEffect(() => {
    if (!open) return
    setWindowDays(String(forecast.params.windowDays))
    setLow(String(forecast.params.lowFactor).replace('.', ','))
    setHigh(String(forecast.params.highFactor).replace('.', ','))
    setResult(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  const num = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.')))
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Recalcular cenário"
      description="As premissas ficam registradas nesta oferta. Matrículas observadas e decisão não mudam."
      footer={
        <>
          {forecast.customParams ? (
            <Button
              variant="ghost"
              className="mr-auto"
              onClick={() => {
                const r = dispatch('resetForecast', { offeringId: offering.id })
                setResult(r)
                if (r.ok) {
                  toast('Cenário voltou às premissas padrão.')
                  onOpenChange(false)
                }
              }}
            >
              Voltar ao padrão
            </Button>
          ) : null}
          <Button onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={() => {
              const r = dispatch('recalcForecast', { offeringId: offering.id, windowDays: num(windowDays), lowFactor: num(low), highFactor: num(high) })
              setResult(r)
              if (r.ok) {
                toast('Cenário recalculado com as novas premissas.')
                onOpenChange(false)
              }
            }}
          >
            Recalcular
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Janela do ritmo (dias)" hint={`Quantos dias de snapshots entram no ritmo líquido. Padrão: ${DEFAULT_FORECAST.windowDays}. Entre 7 e 60.`}>
          {(p) => <Input {...p} inputMode="numeric" value={windowDays} onChange={(e) => setWindowDays(e.target.value)} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fator do cenário conservador" hint={`Multiplica o ritmo. Padrão: ${String(DEFAULT_FORECAST.lowFactor).replace('.', ',')}. De 0 a 1.`}>
            {(p) => <Input {...p} inputMode="decimal" value={low} onChange={(e) => setLow(e.target.value)} />}
          </Field>
          <Field label="Fator do cenário favorável" hint={`Padrão: ${String(DEFAULT_FORECAST.highFactor).replace('.', ',')}. De 1 a 3.`}>
            {(p) => <Input {...p} inputMode="decimal" value={high} onChange={(e) => setHigh(e.target.value)} />}
          </Field>
        </div>
        <CommandError result={result} />
      </div>
    </Dialog>
  )
}
