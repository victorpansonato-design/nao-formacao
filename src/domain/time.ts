import type { IsoDate, IsoInstant } from './types'

const SP_OFFSET_MS = 3 * 60 * 60 * 1000
export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

export const ms = (iso: string): number => Date.parse(iso)

/** Instante ISO no fuso de São Paulo (UTC−03:00, sem horário de verão). */
export function toSpIso(epochMs: number): IsoInstant {
  return new Date(epochMs - SP_OFFSET_MS).toISOString().slice(0, 19) + '-03:00'
}

export const addMs = (iso: IsoInstant, delta: number): IsoInstant => toSpIso(ms(iso) + delta)

/** Data civil (YYYY-MM-DD) em São Paulo para um instante. */
export const civilDate = (iso: IsoInstant): IsoDate => toSpIso(ms(iso)).slice(0, 10)

/** Meio-dia local da data civil, para aritmética de dias sem borda de fuso. */
export const dateMs = (date: IsoDate): number => Date.parse(`${date}T12:00:00-03:00`)

export const addDays = (date: IsoDate, days: number): IsoDate => toSpIso(dateMs(date) + days * DAY).slice(0, 10)

export const daysBetween = (from: IsoDate, to: IsoDate): number => Math.round((dateMs(to) - dateMs(from)) / DAY)
