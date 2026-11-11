import {
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_basic,
  tableFeatures,
  useTable,
  type ColumnDef,
  type PaginationState,
  type RowData,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { int } from '@/shared/format'
import { cn } from '@/shared/lib/cn'
import { Button } from './button'

/** Tabela aberta (divisórias discretas, sem caixa por linha), com ordenação e paginação TanStack v9. */

const features = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns: { basic: sortFn_basic },
})

export interface Column<T> {
  id: string
  header: string
  cell: (row: T) => ReactNode
  /** Valor de ordenação. Sem ele, a coluna não ordena. */
  sort?: (row: T) => string | number
  align?: 'left' | 'right'
  /** Classe de largura (ex.: 'w-40'). */
  width?: string
  /** Esconde a coluna abaixo do breakpoint, para leitura em telas menores. */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl'
}

const HIDE = { sm: 'max-sm:hidden', md: 'max-md:hidden', lg: 'max-lg:hidden', xl: 'max-xl:hidden' }

export function DataTable<T extends RowData>({
  data,
  columns,
  rowKey,
  onRowClick,
  rowLabel,
  pageSize = 25,
  empty,
  initialSort,
  caption,
  dense,
  footerNote,
}: {
  data: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  /** Rótulo acessível da ação de linha (ex.: nome do aluno). */
  rowLabel?: (row: T) => string
  pageSize?: number
  empty?: ReactNode
  initialSort?: { id: string; desc?: boolean }
  caption: string
  dense?: boolean
  footerNote?: ReactNode
}) {
  const [sorting, setSorting] = useState<SortingState>(initialSort ? [{ id: initialSort.id, desc: Boolean(initialSort.desc) }] : [])
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize })

  const defs = useMemo<ColumnDef<typeof features, T, unknown>[]>(
    () =>
      columns.map((c) => ({
        id: c.id,
        header: c.header,
        accessorFn: (row: T) => (c.sort ? c.sort(row) : ''),
        enableSorting: Boolean(c.sort),
        sortFn: 'basic' as const,
      })),
    [columns],
  )
  const byId = useMemo(() => new Map(columns.map((c) => [c.id, c])), [columns])

  const table = useTable({
    features,
    columns: defs,
    data,
    getRowId: rowKey,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    autoResetPageIndex: false,
  })

  // Filtro mudou o total: voltar à primeira página se a atual deixou de existir.
  const pageCount = Math.max(1, Math.ceil(data.length / pagination.pageSize))
  useEffect(() => {
    if (pagination.pageIndex > pageCount - 1) setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [pageCount, pagination.pageIndex])

  const rows = table.getRowModel().rows
  const from = data.length === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1
  const to = Math.min(data.length, (pagination.pageIndex + 1) * pagination.pageSize)

  return (
    <div className="flex min-w-0 flex-col">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="border-b border-line">
                {group.headers.map((header) => {
                  const col = byId.get(header.column.id)!
                  const sorted = header.column.getIsSorted()
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                      className={cn('h-9 px-3 text-xs font-medium whitespace-nowrap text-subtle first:pl-4 last:pr-4', col.align === 'right' ? 'text-right' : 'text-left', col.width, col.hideBelow && HIDE[col.hideBelow])}
                    >
                      {col.sort ? (
                        <button type="button" onClick={header.column.getToggleSortingHandler()} className={cn('-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-fg', sorted && 'text-fg')}>
                          {col.header}
                          {sorted === 'asc' ? <ArrowUp className="size-3.5" aria-hidden /> : sorted === 'desc' ? <ArrowDown className="size-3.5" aria-hidden /> : <ChevronsUpDown className="size-3.5 opacity-50" aria-hidden />}
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'link' : undefined}
                aria-label={onRowClick && rowLabel ? `Abrir ${rowLabel(row.original)}` : undefined}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                onKeyDown={onRowClick ? (event) => { if (event.key === 'Enter') onRowClick(row.original) } : undefined}
                className={cn('border-b border-line last:border-b-0', onRowClick && 'cursor-pointer transition-colors duration-[100ms] hover:bg-hover focus-visible:bg-hover focus-visible:outline-offset-[-2px]')}
              >
                {columns.map((col) => (
                  <td key={col.id} className={cn('px-3 first:pl-4 last:pr-4', dense ? 'h-10 py-1.5' : 'h-12 py-2', col.align === 'right' && 'tabular text-right', col.width, col.hideBelow && HIDE[col.hideBelow])}>
                    {col.cell(row.original)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length === 0 ? empty : null}
      {data.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2 text-[13px] text-muted">
          <p className="tabular" aria-live="polite">
            {int(from)}–{int(to)} de {int(data.length)}
            {footerNote ? <span className="ml-2">{footerNote}</span> : null}
          </p>
          {pageCount > 1 ? (
            <div className="flex items-center gap-1">
              <span className="tabular mr-1">
                Página {pagination.pageIndex + 1} de {pageCount}
              </span>
              <Button variant="ghost" size="icon-sm" aria-label="Página anterior" disabled={pagination.pageIndex === 0} onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex - 1 }))}>
                <ChevronLeft />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Próxima página" disabled={pagination.pageIndex >= pageCount - 1} onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))}>
                <ChevronRight />
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
