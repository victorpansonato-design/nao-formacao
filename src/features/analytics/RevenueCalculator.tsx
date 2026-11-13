import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts'
import type { Policies } from '@/domain/types'
import { int, money, moneyCompact, moneyRound, parseMoney, pct } from '@/shared/format'
import { prefersReducedMotion } from '@/shared/motion'
import { Button } from '@/shared/ui/button'
import { Callout, Field, Input, Panel, PanelHeader, SimTag } from '@/shared/ui/primitives'
import { calculate, sensitivity, validate, type CalcInput } from './calculator'

interface Draft {
  students: string
  baseline: string
  scenario: string
  ticket: string
  months: string
  retention: string
  collection: string
  variable: string
  project: string
}

function draftFrom(p: Policies['scenarioRevenue']): Draft {
  return {
    students: String(p.students),
    baseline: String(p.baselineConversionBps / 100),
    scenario: String(p.scenarioConversionBps / 100),
    ticket: (p.monthlyTuitionCents / 100).toFixed(2).replace('.', ','),
    months: String(p.months),
    retention: '100',
    collection: '100',
    variable: '0,00',
    project: '0,00',
  }
}

const num = (text: string) => (text.trim() === '' ? Number.NaN : Number(text.replace(',', '.')))

function toInput(d: Draft): CalcInput {
  return {
    students: num(d.students),
    baselineBps: Math.round(num(d.baseline) * 100),
    scenarioBps: Math.round(num(d.scenario) * 100),
    ticketCents: parseMoney(d.ticket) ?? Number.NaN,
    months: num(d.months),
    retentionBps: Math.round(num(d.retention) * 100),
    collectionBps: Math.round(num(d.collection) * 100),
    variableCostCents: parseMoney(d.variable) ?? Number.NaN,
    projectCostCents: parseMoney(d.project) ?? Number.NaN,
  }
}

const FIELDS: { key: keyof Draft; label: string; hint?: string }[] = [
  { key: 'students', label: 'Base elegível (alunos)' },
  { key: 'baseline', label: 'Conversão de referência (%)', hint: 'Sem o projeto' },
  { key: 'scenario', label: 'Conversão no cenário (%)' },
  { key: 'ticket', label: 'Ticket mensal (R$)' },
  { key: 'months', label: 'Duração (parcelas)' },
  { key: 'retention', label: 'Permanência mensal (%)', hint: '100 = ninguém sai' },
  { key: 'collection', label: 'Recebimento esperado (%)' },
  { key: 'variable', label: 'Custo variável por aluno/mês (R$)' },
  { key: 'project', label: 'Custo do projeto (R$)' },
]

export function Calculator({ scenario }: { scenario: Policies['scenarioRevenue'] }) {
  const initial = useMemo(() => draftFrom(scenario), [scenario])
  const [draft, setDraft] = useState<Draft>(initial)
  const input = toInput(draft)
  const error = validate(input)
  const result = error ? null : calculate(input)
  const rows = error ? [] : sensitivity(input)
  const changed = JSON.stringify(draft) !== JSON.stringify(initial)

  return (
    <Panel>
      <PanelHeader
        title="Calculadora de continuidade"
        description="Cenário editável. Parte do exemplo do relato; as premissas não são salvas nem viram indicador."
        actions={
          <>
            <SimTag>Cenário</SimTag>
            <Button size="sm" disabled={!changed} onClick={() => setDraft(initial)}>
              Voltar ao exemplo
            </Button>
          </>
        }
      />
      <div className="grid gap-x-6 gap-y-5 p-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="grid content-start gap-3 sm:grid-cols-2 xl:grid-cols-2">
          {FIELDS.map((f) => (
            <Field key={f.key} label={f.label} hint={f.hint}>
              {(props) => <Input {...props} inputMode="decimal" value={draft[f.key]} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />}
            </Field>
          ))}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {error || !result ? (
            <Callout tone="danger" role="alert">
              {error}
            </Callout>
          ) : (
            <>
              <dl className="grid gap-px overflow-hidden rounded-ctl border border-line bg-line sm:grid-cols-3 [&>div]:bg-surface [&>div]:px-3 [&>div]:py-2.5">
                <div>
                  <dt className="text-xs text-muted">Receita bruta nominal de referência no cenário</dt>
                  <dd className="tabular text-lg font-semibold">{moneyRound(result.scenario.nominalCents)}</dd>
                  <dd className="tabular text-xs text-muted">{int(Math.round(result.scenario.converted))} alunos × {money(input.ticketCents)} × {input.months}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Incremento nominal sobre a referência</dt>
                  <dd className="tabular text-lg font-semibold">{moneyRound(result.nominalIncrementCents)}</dd>
                  <dd className="tabular text-xs text-muted">{int(Math.round(result.additionalStudents))} continuidades adicionais ({pct(input.baselineBps)} → {pct(input.scenarioBps)})</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Valor incremental com as premissas</dt>
                  <dd className="tabular text-lg font-semibold">{moneyRound(result.incrementalValueCents)}</dd>
                  <dd className="text-xs text-muted">Contribuição esperada − referência − custo do projeto</dd>
                </div>
              </dl>

              <div>
                <p className="mb-1 text-[13px] font-medium">Sensibilidade: receita nominal por taxa de continuidade efetivada</p>
                <div className="h-44" role="img" aria-label="Gráfico de barras da receita bruta nominal por taxa de continuidade. Os mesmos valores estão na tabela abaixo.">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rows.map((r) => ({ name: pct(r.bps), valor: r.row.nominalCents / 100 }))} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                      <YAxis width={64} tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickFormatter={(v: number) => moneyCompact(v * 100)} />
                      <ChartTooltip cursor={{ fill: 'var(--surface-hover)' }} contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text)' }} formatter={(v) => [moneyRound(Number(v) * 100), 'Receita nominal']} />
                      <Bar dataKey="valor" fill="var(--chart-observed)" radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={!prefersReducedMotion()} animationDuration={350} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <caption className="sr-only">Sensibilidade por taxa de continuidade</caption>
                    <thead>
                      <tr className="border-b border-line text-left text-xs text-subtle">
                        <th scope="col" className="py-1.5 pr-3 font-medium">Continuidade</th>
                        <th scope="col" className="py-1.5 pr-3 text-right font-medium">Alunos</th>
                        <th scope="col" className="py-1.5 pr-3 text-right font-medium">Receita mensal nominal</th>
                        <th scope="col" className="py-1.5 pr-3 text-right font-medium">Nominal, sem perdas</th>
                        <th scope="col" className="py-1.5 text-right font-medium">Esperada com premissas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.bps} className="tabular border-b border-line last:border-b-0">
                          <td className="py-1.5 pr-3">{pct(r.bps)}</td>
                          <td className="py-1.5 pr-3 text-right">{int(Math.round(r.row.converted))}</td>
                          <td className="py-1.5 pr-3 text-right">{moneyRound(Math.round(r.row.converted * input.ticketCents))}</td>
                          <td className="py-1.5 pr-3 text-right">{moneyRound(r.row.nominalCents)}</td>
                          <td className="py-1.5 text-right">{moneyRound(r.row.expectedRevenueCents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
          <Callout tone="warning" title="Como ler este cenário">
            É receita bruta nominal de referência: pressupõe preço constante e, no exemplo, todos continuando e pagando. Não é lucro, não é receita realizada, não é valor presente e não pode ser atribuído inteiro ao projeto, porque parte dos alunos já migraria no processo atual.
          </Callout>
        </div>
      </div>
    </Panel>
  )
}
