/** Exportação real de arquivos e leitura de CSV/JSON. Tudo local; nada sai do navegador. */

const BOM = String.fromCharCode(0xfeff)

export function downloadText(fileName: string, content: string, mime = 'text/plain;charset=utf-8'): void {
  // BOM em CSV para o Excel reconhecer UTF-8.
  const body = mime.startsWith('text/csv') ? BOM + content : content
  const url = URL.createObjectURL(new Blob([body], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Neutraliza células que uma planilha interpretaria como fórmula (=, +, -, @, tab, CR). */
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[";\n\r,]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(headers: string[], rows: unknown[][], preamble: string[] = [], separator = ';'): string {
  const lines = [...preamble.map((line) => csvCell(`# ${line}`)), headers.map(csvCell).join(separator), ...rows.map((r) => r.map(csvCell).join(separator))]
  return lines.join('\r\n') + '\r\n'
}

/** Linhas de cabeçalho de toda exportação: filtros, data de referência e marca sintética. */
export function exportPreamble(title: string, asOf: string, filters: Record<string, string | undefined>, definitions: string[] = []): string[] {
  const active = Object.entries(filters).filter(([, v]) => v)
  return [
    `Continua · ${title}`,
    'DADOS FICTÍCIOS DE DEMONSTRAÇÃO. Não usar como resultado ou base real.',
    `Referência (asOf): ${asOf}`,
    `Filtros: ${active.length > 0 ? active.map(([k, v]) => `${k}=${v}`).join(' | ') : 'nenhum'}`,
    ...definitions.map((d) => `Definição: ${d}`),
  ]
}

export interface CsvParse {
  headers: string[]
  rows: string[][]
  separator: string
}

/**
 * Parser CSV com aspas, aspas duplicadas, quebras de linha dentro de campo e separador declarado
 * ou detectado (; , ou tab). Não é um split.
 */
export function parseCsv(input: string, separator?: string): CsvParse {
  const text = input.startsWith(BOM) ? input.slice(1) : input
  const firstLine = text.split(/\r?\n/).find((l) => l.trim() && !l.startsWith('#') && !l.startsWith('"#')) ?? ''
  const sep = separator ?? ([';', ',', '\t'].map((s) => [s, firstLine.split(s).length] as const).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ';')
  const records: string[][] = []
  let field = ''
  let record: string[] = []
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 1
        } else quoted = false
      } else field += ch
    } else if (ch === '"' && field === '') quoted = true
    else if (ch === sep) {
      record.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1
      record.push(field)
      field = ''
      records.push(record)
      record = []
    } else field += ch
  }
  if (field !== '' || record.length > 0) {
    record.push(field)
    records.push(record)
  }
  const data = records.filter((r) => r.some((c) => c.trim() !== '') && !r[0]?.trimStart().startsWith('#'))
  const [headers = [], ...rows] = data
  return { headers: headers.map((h) => h.trim()), rows, separator: sep }
}

/** Checksum estável (FNV-1a) para reconhecer o mesmo lote reimportado. */
export function checksum(text: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export function readFileText(file: File): Promise<string> {
  return file.text()
}
