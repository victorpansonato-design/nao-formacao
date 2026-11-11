/** Formatação central em pt-BR e fuso de São Paulo. Não formate dinheiro ou data fora daqui. */

const TZ = 'America/Sao_Paulo'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const brlRound = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const brlCompact = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 })
const integer = new Intl.NumberFormat('pt-BR')
const dateFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' })
const dateShortFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: 'short' })
const dateLongFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
const dateTimeFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const weekdayFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, weekday: 'short', day: '2-digit', month: 'short' })

/** Aceita instante ISO ou data civil YYYY-MM-DD (interpretada ao meio-dia local). */
function toDate(value: string): Date {
  return new Date(value.length === 10 ? `${value}T12:00:00-03:00` : value)
}

export const money = (cents: number) => brl.format(cents / 100)
export const moneyRound = (cents: number) => brlRound.format(cents / 100)
export const moneyCompact = (cents: number) => brlCompact.format(cents / 100)
export const int = (n: number) => integer.format(n)
export const fmtDate = (value: string) => dateFmt.format(toDate(value))
export const fmtDateShort = (value: string) => dateShortFmt.format(toDate(value)).replace('.', '')
export const fmtDateLong = (value: string) => dateLongFmt.format(toDate(value))
export const fmtTime = (value: string) => timeFmt.format(toDate(value))
export const fmtDateTime = (value: string) => dateTimeFmt.format(toDate(value)).replace(',', ' ·')
export const fmtWeekday = (value: string) => weekdayFmt.format(toDate(value)).replace(/\./g, '')

/** Pontos-base → "10%" ou "7,5%". */
export function pct(bps: number): string {
  return `${(bps / 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

/** Razão com denominador explícito: "12 de 70 (17%)". */
export function ratio(value: number, total: number): string {
  if (total <= 0) return `${int(value)}`
  return `${int(value)} de ${int(total)} (${Math.round((value / total) * 100)}%)`
}

export function share(value: number, total: number): string {
  return total > 0 ? `${Math.round((value / total) * 100)}%` : '—'
}

/** Tempo relativo ao relógio da demonstração (nunca ao relógio real). */
export function relative(value: string, now: string): string {
  const diff = toDate(value).getTime() - toDate(now).getTime()
  const abs = Math.abs(diff)
  const minutes = Math.round(abs / 60_000)
  const unit = minutes < 60 ? `${minutes} min` : minutes < 60 * 36 ? `${Math.round(minutes / 60)} h` : `${Math.round(minutes / 1440)} dias`
  if (minutes < 1) return 'agora'
  return diff < 0 ? `há ${unit}` : `em ${unit}`
}

export function hours(value: number | null): string {
  if (value === null) return '—'
  if (value < 1) return `${Math.max(1, Math.round(value * 60))} min`
  if (value < 48) return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`
  return `${(value / 24).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias`
}

export function initials(name: string): string {
  const parts = name.replace(/\b(demo|Consultor|Consultora)\b/gi, '').trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts.at(-1)![0] : '')).toUpperCase()
}

/** Normaliza para busca: sem acento e em minúsculas. O nome original é preservado na exibição. */
export function searchKey(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Converte "450", "450,00" ou "R$ 1.250,50" em centavos; null se inválido. */
export function parseMoney(input: string): number | null {
  const clean = input.replace(/[R$\s.]/g, '').replace(',', '.')
  if (!clean || !/^\d+(\.\d{1,2})?$/.test(clean)) return null
  return Math.round(Number(clean) * 100)
}

/** Valor para <input type="datetime-local"> no fuso de São Paulo, e o caminho de volta. */
export function toLocalInput(iso: string): string {
  return new Date(new Date(iso).getTime() - 3 * 3_600_000).toISOString().slice(0, 16)
}
export function fromLocalInput(value: string): string {
  return `${value.length === 16 ? `${value}:00` : value}-03:00`
}
