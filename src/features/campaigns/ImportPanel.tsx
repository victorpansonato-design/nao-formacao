import { useState } from 'react'
import { z } from 'zod'
import type { ImportRow } from '@/domain/commands/campaign'
import type { Result } from '@/domain/errors'
import { useDispatch, useDomain } from '@/services/store'
import { Button } from '@/shared/ui/button'
import { DataTable } from '@/shared/ui/data-table'
import { CommandError, toast } from '@/shared/ui/feedback'
import { Callout, Checkbox, Field, Input, Panel, PanelHeader } from '@/shared/ui/primitives'

const rowsSchema = z.array(z.object({ externalKey: z.string().trim().min(1), name: z.string().trim().min(1), offeringId: z.string().min(1) })).min(1).max(5000)

export function ImportPanel() {
  const dispatch = useDispatch()
  const offerings = useDomain((d) => d.offerings)
  const [file, setFile] = useState<{ name: string; checksum: string; rows: ImportRow[] } | null>(null)
  const [synthetic, setSynthetic] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result<unknown> | null>(null)
  return <Panel><PanelHeader title="Importar matrículas sintéticas" description="JSON com os campos externalKey (matrícula), name (nome fictício) e offeringId (oferta). A prévia é obrigatória." /><div className="grid gap-4 p-4"><Callout>Use somente uma base fictícia. O lote é validado integralmente antes de gravar. Repetir o mesmo arquivo não duplica matrículas.</Callout><Field label="Arquivo JSON de demonstração">{(p) => <Input {...p} type="file" accept="application/json,.json" disabled={busy} onChange={async (e) => { const selected = e.target.files?.[0]; setFile(null); setResult(null); setSynthetic(false); if (!selected) return; setBusy(true); try { if (selected.size > 2_000_000) throw new Error('O limite do lote é 2 MB.'); const text = await selected.text(); const rows = rowsSchema.parse(JSON.parse(text)); const keys = new Set<string>(); const issues: string[] = []; rows.forEach((row, i) => { if (keys.has(row.externalKey)) issues.push(`Linha ${i + 1}: matrícula repetida.`); keys.add(row.externalKey); if (!offerings.some((o) => o.id === row.offeringId)) issues.push(`Linha ${i + 1}: oferta desconhecida ${row.offeringId}.`) }); if (issues.length) throw new Error(issues.slice(0, 12).join(' ')); const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(rows))); const checksum = Array.from(new Uint8Array(digest)).map((n) => n.toString(16).padStart(2, '0')).join(''); setFile({ name: selected.name, checksum, rows }) } catch (error) { setResult({ ok: false, code: 'invalid', message: error instanceof z.ZodError ? error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).slice(0, 8).join(' · ') : error instanceof Error ? error.message : 'Não foi possível ler o lote.' }) } finally { setBusy(false) } }} />}</Field>
    {file ? <><p>{file.rows.length} linhas validadas · {file.name}</p><DataTable caption="Prévia do lote sintético" data={file.rows} columns={[{ id: 'matricula', header: 'Matrícula', cell: (r) => r.externalKey }, { id: 'nome', header: 'Nome fictício', cell: (r) => r.name }, { id: 'oferta', header: 'Oferta', cell: (r) => r.offeringId }]} rowKey={(r) => r.externalKey} pageSize={5} /><Checkbox label="Confirmo que este arquivo contém apenas dados sintéticos" checked={synthetic} onChange={(e) => setSynthetic(e.target.checked)} /><Button disabled={!synthetic || busy} onClick={() => { const r = dispatch('importStudents', { fileName: file.name, checksum: file.checksum, rows: file.rows }); setResult(r); if (r.ok) { toast(r.data.duplicateBatch ? 'Lote já importado; nenhuma duplicação.' : `${r.data.accepted} matrículas importadas e ${r.data.updated} atualizadas.`); setFile(null) } }}>Confirmar importação local</Button></> : null}
    <CommandError result={result} />
  </div></Panel>
}
