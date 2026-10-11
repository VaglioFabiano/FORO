/**
 * Tempo e date, sempre in ora italiana (Europe/Rome) indipendentemente dal browser.
 * Formati del manuale: date "GIO 16.10", orari "14:30–19:00" (trattino lungo, Plex Mono).
 */

export const TZ = "Europe/Rome";

export const GIORNI = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"] as const;
export type Giorno = (typeof GIORNI)[number];
export const GIORNI_BREVI = ["LUN", "MAR", "MER", "GIO", "VEN", "SAB", "DOM"] as const;
export const MESI = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
] as const;
export const MESI_BREVI = ["GEN", "FEB", "MAR", "APR", "MAG", "GIU", "LUG", "AGO", "SET", "OTT", "NOV", "DIC"] as const;

/** Parti della data/ora corrente a Roma */
export function romeNow(d: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wd = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday"));
  const hour = Number(get("hour")) % 24;
  return {
    iso: `${get("year")}-${get("month")}-${get("day")}`,
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour,
    minute: Number(get("minute")),
    second: Number(get("second")),
    /** 0 = lunedì … 6 = domenica */
    weekday: wd,
    minutes: hour * 60 + Number(get("minute")),
  };
}

/** "HH:MM" → minuti dalla mezzanotte ("24:00" → 1440) */
export function toMin(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}
export function fromMin(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Data ISO locale (YYYY-MM-DD) → Date a mezzogiorno UTC, sicura rispetto ai fusi */
export function isoToDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}
export function dateToIso(d: Date) {
  return d.toISOString().slice(0, 10);
}
export function addDays(iso: string, n: number) {
  const d = isoToDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return dateToIso(d);
}
/** 0 = lunedì … 6 = domenica */
export function weekdayOf(iso: string) {
  return (isoToDate(iso).getUTCDay() + 6) % 7;
}
export function mondayOf(iso: string) {
  return addDays(iso, -weekdayOf(iso));
}
export function diffDays(a: string, b: string) {
  return Math.round((isoToDate(b).getTime() - isoToDate(a).getTime()) / 86400000);
}
export function todayIso() {
  return romeNow().iso;
}

/* ───────── formati ───────── */

/** "GIO 16.10" */
export function fmtShort(iso: string) {
  const d = isoToDate(iso);
  return `${GIORNI_BREVI[weekdayOf(iso)]} ${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
/** "giovedì 15 ottobre" (+ anno opzionale) */
export function fmtLong(iso: string, withYear = false) {
  const d = isoToDate(iso);
  return `${GIORNI[weekdayOf(iso)]} ${d.getUTCDate()} ${MESI[d.getUTCMonth()]}${withYear ? " " + d.getUTCFullYear() : ""}`;
}
/** "15 ottobre 2026" */
export function fmtDate(iso: string, withYear = true) {
  const d = isoToDate(iso);
  return `${d.getUTCDate()} ${MESI[d.getUTCMonth()]}${withYear ? " " + d.getUTCFullYear() : ""}`;
}
/** "15.10.2026" */
export function fmtNumeric(iso: string) {
  const d = isoToDate(iso);
  return `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${d.getUTCFullYear()}`;
}
/** giorno e mese separati, per i blocchi data grandi */
export function dateParts(iso: string) {
  const d = isoToDate(iso);
  return {
    day: String(d.getUTCDate()).padStart(2, "0"),
    month: MESI_BREVI[d.getUTCMonth()],
    monthLong: MESI[d.getUTCMonth()],
    weekday: GIORNI_BREVI[weekdayOf(iso)],
    weekdayLong: GIORNI[weekdayOf(iso)],
    year: d.getUTCFullYear(),
  };
}
/** "14:30–19:00" con trattino lungo, come nel manuale */
export function fmtRange(start: string, end: string) {
  return `${start}–${end}`;
}
export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
/** "tra 3 giorni", "domani", "oggi" */
export function relativeDay(iso: string, from = todayIso()) {
  const n = diffDays(from, iso);
  if (n === 0) return "oggi";
  if (n === 1) return "domani";
  if (n === -1) return "ieri";
  if (n > 1 && n < 7) return `tra ${n} giorni`;
  if (n >= 7 && n < 14) return "tra una settimana";
  if (n >= 14 && n < 31) return `tra ${Math.round(n / 7)} settimane`;
  if (n < 0) return `${-n} giorni fa`;
  const mesi = Math.round(n / 30);
  return mesi === 1 ? "tra un mese" : `tra ${mesi} mesi`;
}
/** durata leggibile: 95 → "1 h 35 min" */
export function fmtDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} ${h === 1 ? "ora" : "ore"}`;
  return `${m} min`;
}
