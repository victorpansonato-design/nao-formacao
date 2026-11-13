import { nominalContractCents } from '@/domain/money'
import type { ProposalTerms } from '@/domain/types'
import { money, pct } from '@/shared/format'
import { cn } from '@/shared/lib/cn'

/** Preço por período: o valor durante o benefício e o valor depois dele ficam lado a lado. */
export function PriceByPeriod({ terms, className }: { terms: ProposalTerms; className?: string }) {
  const hasBenefit = terms.discountBps > 0 && terms.discountInstallments > 0
  const after = terms.installmentCount - terms.discountInstallments
  return (
    <div className={cn('overflow-hidden rounded-ctl border border-line', className)}>
      <table className="w-full text-sm">
        <caption className="sr-only">Preço por período</caption>
        <thead>
          <tr className="border-b border-line bg-sunken text-left text-xs text-subtle">
            <th scope="col" className="px-3 py-1.5 font-medium">Período</th>
            <th scope="col" className="px-3 py-1.5 font-medium">Parcelas</th>
            <th scope="col" className="px-3 py-1.5 text-right font-medium">Valor por parcela</th>
          </tr>
        </thead>
        <tbody>
          {hasBenefit ? (
            <tr className="border-b border-line">
              <th scope="row" className="px-3 py-2 text-left font-normal">
                Com benefício <span className="text-muted">({pct(terms.discountBps)})</span>
              </th>
              <td className="tabular px-3 py-2">1ª à {terms.discountInstallments}ª</td>
              <td className="tabular px-3 py-2 text-right font-semibold">{money(terms.discountedCents)}</td>
            </tr>
          ) : null}
          <tr>
            <th scope="row" className="px-3 py-2 text-left font-normal">{hasBenefit ? 'Depois do benefício' : 'Valor regular'}</th>
            <td className="tabular px-3 py-2">
              {hasBenefit ? `${terms.discountInstallments + 1}ª à ${terms.installmentCount}ª (${after})` : `1ª à ${terms.installmentCount}ª`}
            </td>
            <td className="tabular px-3 py-2 text-right font-semibold">{money(terms.regularCents)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export function termsSummary(terms: ProposalTerms): string {
  return terms.discountBps > 0
    ? `${money(terms.discountedCents)} por ${terms.discountInstallments} parcelas, depois ${money(terms.regularCents)}`
    : `${money(terms.regularCents)} por parcela, sem benefício`
}

export function termsRows(terms: ProposalTerms) {
  return [
    { label: 'Prazo do benefício', value: terms.discountBps > 0 ? `${terms.discountInstallments} parcelas` : 'Sem benefício' },
    { label: 'Valor após o benefício', value: money(terms.regularCents) },
    { label: 'Custo da concessão', value: terms.concessionCostCents > 0 ? `${money(terms.concessionCostCents)} no prazo todo` : 'Nenhum' },
    { label: 'Crédito do valor já pago', value: terms.creditCents > 0 ? `${money(terms.creditCents)} aproveitados (mesmo valor; não é receita nova)` : 'Nenhum valor pago em aberto' },
    { label: 'Contrato nominal', value: `${money(nominalContractCents(terms))} · cenário sem perdas, não é recebimento` },
  ]
}
